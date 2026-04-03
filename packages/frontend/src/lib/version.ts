function safeGlobal(fn: () => string, fallback: string): string {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const APP_VERSION = safeGlobal(() => __APP_VERSION__, "dev");
export const BUILD_TIMESTAMP = safeGlobal(() => __BUILD_TIMESTAMP__, "");
