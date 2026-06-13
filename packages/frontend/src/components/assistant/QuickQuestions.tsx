import type { ReactNode } from "react";

interface QuickQuestionsProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a row of suggestion buttons in a flex-wrap container. Unlike
 * the AI Elements `Suggestions` carousel, this stays scroll-free: when
 * the viewport is narrow the items wrap onto multiple rows instead of
 * overflowing a single line with a hidden scrollbar. Use it for short,
 * fixed-size lists (e.g. the greeting's 4 quick questions); reach for
 * the carousel `Suggestions` when you have many items in a single row.
 */
export function QuickQuestions({ children, className }: QuickQuestionsProps) {
  return (
    <div
      className={`flex w-full flex-wrap items-center justify-center gap-2 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
