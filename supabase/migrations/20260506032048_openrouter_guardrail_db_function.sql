-- migration: openrouter_guardrail_db_function
-- purpose: minimal generic http proxy via postgres http extension.
--          bypasses deno's tls fingerprinting issue with cloudflare.
--          accepts url, body and headers from caller — zero hardcoded logic.
--
-- affected schema: public
-- dependencies: extensions.http (postgresql http client extension)

-- enable http extension if available. this extension provides http client
-- capabilities from within postgres, using libcurl (which uses openssl tls
-- and does not suffer from the rustls fingerprinting issue that blocks deno).
create extension if not exists "http" with schema "extensions";

-- generic http proxy: accepts url, body and headers array.
-- returns {status, content}. caller handles all parsing and logic.
create or replace function public.http_post(
  p_url text,
  p_body text,
  p_headers jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_request extensions.http_request;
  v_response extensions.http_response;
begin
  -- set generous timeouts for external api calls
  -- default is 5s which is too short for some providers like openrouter
  -- free tier models can take up to ~2 min
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '120');
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '10');

  v_request := (
    'POST',
    p_url,
    (select array_agg(extensions.http_header(elem->>'field', elem->>'value'))
     from jsonb_array_elements(p_headers) elem),
    'application/json',
    p_body::varchar
  )::extensions.http_request;

  select * into v_response from extensions.http(v_request);

  return jsonb_build_object(
    'status', v_response.status,
    'content', v_response.content
  );
end;
$$;

grant execute on function public.http_post(text, text, jsonb) to service_role;
grant execute on function public.http_post(text, text, jsonb) to authenticated;

comment on function public.http_post(text, text, jsonb) is
  'Generic HTTP POST proxy via PostgreSQL http extension. Accepts url, body, and headers jsonb array. Returns {status, content}.';
