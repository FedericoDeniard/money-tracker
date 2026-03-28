---
name: supabase-safe-mcp
description: Restrict Supabase MCP to only SELECT and safe data reads. Never apply migrations, RLS changes, DDL, or destructive mutations.
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: supabase
---

## Strict rules for Supabase MCP tools

**ALWAYS follow these rules without exception:**

### PROHIBITED (never use these tools):
- `supabase-local_apply_migration`: Do not apply DDL migrations directly.
- `supabase-local_execute_sql`: Do not execute raw SQL that modifies schema, data, or RLS.
- Any SQL with `CREATE`, `ALTER`, `DROP`, `UPDATE`, `DELETE`, `INSERT` in production or without explicit user confirmation.

### ALLOWED (reads only):
- `supabase-local_list_tables`
- `supabase-local_list_extensions`
- `supabase-local_list_migrations`
- `supabase-local_get_logs`
- `supabase-local_get_advisors`
- `supabase-local_get_project_url`
- `supabase-local_get_publishable_keys`
- `supabase-local_generate_typescript_types`
- **Only SELECT queries** in `supabase-local_execute_sql` for data inspection.

## Recommended workflow
1. **Analyze first**: Use list and advisors tools to understand the state.
2. **Generate scripts**: Write migrations/SQL to `.sql` files and ask user confirmation.
3. **Ask approval**: Before any change, ask: "Do you want me to apply this migration? Provide explicit confirmation."
4. **Use files**: For changes, use `supabase migration new` and `supabase db push` manually.

## When user requests changes
- **DO NOT apply directly**. Say: "I'll generate the SQL/migration. Review and apply manually with `supabase db push`."
- Example response: "Here's the migration in `migrations/001_add_rls.sql`. Run `supabase migration up` after review."

This prevents accidental DB errors.