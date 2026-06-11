import type { ReactNode } from "react";
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
  return (
    <div
      className={
        show
          ? "flex flex-1 min-h-0 flex-col gap-4 md:grid md:grid-cols-[1fr_320px] md:gap-4"
          : "flex flex-1 min-h-0 flex-col"
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {show && (
        <aside className="flex min-h-0 md:h-full md:overflow-hidden">
          <HistoryList
            activeThreadId={activeThreadId}
            onSelect={onSelect}
            onNewChat={onNewChat}
          />
        </aside>
      )}
    </div>
  );
}
