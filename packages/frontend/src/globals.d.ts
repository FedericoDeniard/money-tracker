// Injected at build time by build.ts via Bun's `define` option.
// In dev mode these are not defined — use lib/version.ts which provides safe fallbacks.
declare const __APP_VERSION__: string;
declare const __BUILD_TIMESTAMP__: string;
