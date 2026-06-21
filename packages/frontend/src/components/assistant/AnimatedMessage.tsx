import type { ReactNode } from "react";
import { m } from "framer-motion";

interface AnimatedMessageProps {
  children: ReactNode;
}

/**
 * Wraps a message so it slides in on first mount. Replaces the previous
 * implementation that used useAnimate + inline `style={{ opacity: 0 }}`
 * — that pattern made the initial state lag one frame behind the DOM.
 */
export function AnimatedMessage({ children }: AnimatedMessageProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </m.div>
  );
}
