# Money Tracker - Docker Dev

Este repo se puede levantar en desarrollo con Docker/Compose como unica dependencia en host.

## Prerequisito

- Docker + Docker Compose instalados y en ejecucion.

## Levantar toda la app

```bash
docker compose up --build
```

Esto:
- levanta el contenedor toolbox `supabase-cli`,
- arranca Supabase local dentro del toolbox (`supabase start`) automaticamente,
- levanta el frontend con watch en `http://localhost:3000`.

Antes de levantar, asegurate de tener:
- `packages/frontend/.env`
- `supabase/functions/.env`

Podes crearlos desde los examples:

```bash
cp packages/frontend/.env.example packages/frontend/.env
cp supabase/functions/.env.example supabase/functions/.env
```

Tambien podes usar el wrapper opcional:

```bash
bun run docker:up
```

## Parar todo

```bash
docker compose down
```

Wrapper opcional:

```bash
bun run docker:down
```

## Entrar al contenedor toolbox

```bash
docker compose exec supabase-cli sh
```

Wrapper opcional:

```bash
bun run docker:shell
```

Dentro del toolbox podes ejecutar comandos de Supabase CLI sin instalarlo localmente.

## Comandos de DB (local)

```bash
docker compose run --rm supabase-cli sh -lc "supabase start && supabase db reset --local"
docker compose run --rm supabase-cli sh -lc "supabase start && supabase migration up --include-all --local"
docker compose run --rm supabase-cli sh -lc "supabase start && supabase gen types typescript --local > packages/frontend/src/types/database.types.ts"
```

Wrappers opcionales:

```bash
bun run docker:db:reset
bun run docker:db:migration:up
bun run docker:db:types
```

Notas:
- `docker:db:reset` ejecuta seeds definidos en `supabase/config.toml`.
- Los seeds estan configurados como `sql_paths = ["./seeds/*.sql"]`.
- Primer seed creado: `supabase/seeds/001_auth_test_user.sql` (`user@test.com` / `password123`).
- Segundo seed: `supabase/seeds/002_transactions_test_user.sql` (transacciones demo para `user@test.com`).
- `docker:db:migration:up` aplica pendientes con `--include-all --local`.
- `supabase-cli` usa `network_mode: host` para evitar errores de health-check de Supabase CLI dentro de Docker (flujo validado en Linux).

## Variables de entorno

- Frontend: `packages/frontend/.env.example`
- Supabase Edge Functions: `supabase/functions/.env.example`

El archivo `.env.example` de la raiz queda solo como guia y no como fuente principal de variables.
