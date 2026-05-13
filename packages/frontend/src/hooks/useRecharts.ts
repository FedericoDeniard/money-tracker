let cached: typeof import("recharts") | null = null;
let pending: Promise<typeof import("recharts")> | null = null;

export function useRecharts(): typeof import("recharts") {
  if (cached) return cached;
  if (!pending) {
    pending = import("recharts").then(m => {
      cached = m;
      return m;
    });
  }
  throw pending;
}
