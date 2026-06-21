import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HistoryList } from "./HistoryList";

interface HistorySidebarProps {
  show: boolean;
  activeThreadId: string | null;
  onSelect: (threadId: string) => void;
  onNewChat: () => void;
  children: ReactNode;
}

export function HistorySidebar({
  show,
  activeThreadId,
  onSelect,
  onNewChat,
  children,
}: HistorySidebarProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevShow = useRef(show);
  const hasHistory = show || isAnimating;

  useLayoutEffect(() => {
    if (prevShow.current === true && show === false) {
      setIsAnimating(true);
    }
    prevShow.current = show;
  }, [show]);

  return (
    <div
      className={
        hasHistory
          ? "flex flex-1 min-h-0 flex-col md:grid md:grid-cols-[1fr_320px] md:grid-rows-[1fr] md:gap-4"
          : "flex flex-1 min-h-0 flex-col"
      }
    >
      {/* On mobile, hide chat when history is shown */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${hasHistory ? "hidden md:flex" : ""}`}
      >
        {children}
      </div>
      <AnimatePresence>
        {show && (
          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onAnimationComplete={() => setIsAnimating(false)}
            className="flex min-h-0 overflow-hidden md:h-full md:flex-none"
          >
            <HistoryList
              activeThreadId={activeThreadId}
              onSelect={onSelect}
              onNewChat={onNewChat}
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
