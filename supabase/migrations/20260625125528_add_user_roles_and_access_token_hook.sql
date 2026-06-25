-- Migration: add user roles and custom access token hook
--
-- Purpose:
--   Introduce a simple role system (user | tester | admin) and propagate it
--   into every Supabase access token via a Custom Access Token Auth Hook so
--   frontend, edge functions and Mastra can read the role from the JWT
--   without an extra DB roundtrip per request.
--
-- Design notes:
--   * Roles live in a dedicated `public.user_roles` table — NOT in a column
--     on `public.users` — so that a user who can update their own profile
--     row cannot escalate their own role. The table is RLS-enabled with no
--     policies for `authenticated` / `anon` (they can neither read nor write
--     through the API). Only `service_role` (bypasses RLS) and
--     `supabase_auth_admin` (single policy, used by the auth hook) can touch
--     it. To promote a user to `tester`/`admin`, a service-role-backed edge
--     function or SQL command is required.
--   * `handle_new_user` is updated to also seed a default `user` row in
--     `user_roles` on signup (idempotent via ON CONFLICT).
--   * The auth hook reads the role from `user_roles` and injects it as
--     `user_role` on the JWT. If the user has no row (shouldn't happen after
--     the trigger backfill, but defensive), it falls back to `user` so the
--     claim is always present and the role check never crashes downstream.
--   * Existing users are backfilled in this same migration.

-- 1. Role enum
create type public.app_role as enum ('user', 'tester', 'admin');
comment on type public.app_role is 'Application role. Admin and tester are internal roles with full access. User is the default for new signups.';

-- 2. Roles table
--    One row per (user, role). The unique constraint means a user has at
--    most one row per role; today we only ever insert one role per user,
--    but the table shape allows future multi-role scenarios (e.g. a user
--    that is both `tester` and `admin`).
create table public.user_roles (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, role)
);
comment on table public.user_roles is 'Application roles for each user. Only service_role and supabase_auth_admin can read/write this table — never the user themselves.';

-- Index for the hook lookup
create index user_roles_user_id_idx on public.user_roles using btree (user_id);

-- 3. Extend the signup trigger to also insert the default `user` role.
--    We recreate the function exactly as in
--    supabase/migrations/20260208051800_fix_function_search_path.sql, adding
--    a single extra insert. ON CONFLICT keeps the function idempotent if
--    the trigger ever fires more than once for the same user.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$ language plpgsql security definer
set search_path = '';

-- 4. Backfill: every existing user in `public.users` gets a `user` role row.
--    Safe to re-run thanks to ON CONFLICT.
insert into public.user_roles (user_id, role)
select u.id, 'user'::public.app_role
from public.users u
on conflict (user_id, role) do nothing;

-- 5. RLS on user_roles.
--    Enable RLS and explicitly deny `authenticated` and `anon` (the default
--    deny happens automatically once RLS is on, but the explicit `revoke
--    all` makes the intent obvious and prevents any future grant from
--    accidentally re-exposing the table). `service_role` is not subject to
--    RLS. The only policy is for `supabase_auth_admin` so the custom access
--    token hook below can read the role.
alter table public.user_roles enable row level security;

revoke all on public.user_roles from authenticated;
revoke all on public.user_roles from anon;
revoke all on public.user_roles from public;

grant all on public.user_roles to supabase_auth_admin;

create policy "Allow supabase_auth_admin to read user roles"
on public.user_roles
as permissive
for select
to supabase_auth_admin
using (true);

-- 6. Custom Access Token Auth Hook.
--    Runs before Supabase issues an access token. We look up the user's
--    role in `public.user_roles` and inject it as the `user_role` claim on
--    the JWT. Default to `user` when no row exists so the claim is always
--    present and downstream code can always decode it.
--    The function is `stable` because it always returns the same value for
--    the same input within a single statement.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public.app_role;
begin
  select ur.role
  into user_role
  from public.user_roles ur
  where ur.user_id = (event->>'user_id')::uuid
  order by ur.role  -- deterministic when a user somehow has multiple roles
  limit 1;

  claims := event->'claims';

  if user_role is null then
    user_role := 'user';
  end if;

  claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated;
revoke execute on function public.custom_access_token_hook(jsonb) from anon;
revoke execute on function public.custom_access_token_hook(jsonb) from public;
