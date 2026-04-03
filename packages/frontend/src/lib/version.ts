// __APP_VERSION__ and __BUILD_TIMESTAMP__ are replaced by Bun's `define` in production builds.
// In dev mode (bun --hot) they don't exist at runtime — typeof returns "undefined" without throwing.
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

export const BUILD_TIMESTAMP: string =
  typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : "";
