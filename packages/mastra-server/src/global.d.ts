// Allow imports with `npm:` and `jsr:` specifiers used in the shared
// supabase/functions/_shared/* code. Bun resolves these at runtime;
// TypeScript doesn't need to know their types because all the imported
// values are used as opaque JS objects inside the route handler.
declare module "npm:*";
declare module "jsr:*";
