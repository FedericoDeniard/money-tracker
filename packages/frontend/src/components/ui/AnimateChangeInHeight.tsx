import { useRef, useState, useLayoutEffect } from "react";
import { LazyMotion, m, domAnimation } from "motion/react";
import { cn } from "@/lib/utils";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimateChangeInHeight({
  children,
  className,
}: AnimateChangeInHeightProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    if (containerRef.current) {
      const observedHeight =
        containerRef.current.getBoundingClientRect().height;
      setHeight(observedHeight);
      const resizeObserver = new ResizeObserver(entries => {
        const h = entries[0]?.contentRect.height ?? 0;
        setHeight(h);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={cn(className, "overflow-hidden")}
        style={{ height }}
        animate={{ height }}
        transition={{ duration: 0.1, damping: 20, ease: "easeIn" }}
      >
        <div ref={containerRef}>{children}</div>
      </m.div>
    </LazyMotion>
  );
}
