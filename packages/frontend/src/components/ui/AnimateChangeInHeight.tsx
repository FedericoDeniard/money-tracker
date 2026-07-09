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
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={cn(className)}
        layout
        transition={{ duration: 0.15, ease: "easeInOut" }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
