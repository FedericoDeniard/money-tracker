import type { ReactNode } from "react";
import { HistorySidebar } from "./HistorySidebar";
import { LogoWatermark } from "./LogoWatermark";

/**
 * Bindings for the assistant's history sidebar. Returned by
 * `useAssistantShell` and consumed by both `AssistantLayout` (to
 * render the sidebar) and the input's `HistoryToggleButton`.
 */
export interface AssistantShellBindings {
  showHistory: boolean;
  onToggleHistory: () => void;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
}

interface AssistantLayoutProps extends AssistantShellBindings {
  activeThreadId: string | null;
  children: ReactNode;
}

/**
 * Visual shell shared by the greeting and chat views. Wraps the page
 * content in a HistorySidebar and a relative flex container with the
 * decorative logo watermark. The host view owns the shell state via
 * the `useAssistantShell` hook and spreads the resulting bindings here.
 */
export function AssistantLayout({
  activeThreadId,
  showHistory,
  onSelectThread,
  onNewChat,
  children,
}: AssistantLayoutProps) {
  return (
    <HistorySidebar
      show={showHistory}
      activeThreadId={activeThreadId}
      onSelect={onSelectThread}
      onNewChat={onNewChat}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <LogoWatermark />
        {children}
      </div>
    </HistorySidebar>
  );
}
