import { useCallback, useState } from "react";
import type { AssistantShellBindings } from "../components/assistant/AssistantLayout";

interface UseAssistantShellArgs {
  /** Navigate to a thread by id. Called by the sidebar's row click. */
  onSelectThread: (threadId: string) => void;
  /** Reset to the greeting view. Called by the sidebar's "New chat" button. */
  onNewChat: () => void;
}

/**
 * State + navigation closure for the assistant's history sidebar.
 * Both the greeting and chat views use this to share the same logic
 * for: keeping the sidebar open across the view, closing it whenever
 * a thread is selected or a new chat is started, and toggling it from
 * the HistoryToggleButton inside the prompt input.
 */
export function useAssistantShell({
  onSelectThread,
  onNewChat,
}: UseAssistantShellArgs): AssistantShellBindings {
  const [showHistory, setShowHistory] = useState(false);

  const onToggleHistory = useCallback(() => {
    setShowHistory(v => !v);
  }, []);

  const selectThread = useCallback(
    (threadId: string) => {
      setShowHistory(false);
      onSelectThread(threadId);
    },
    [onSelectThread]
  );

  const newChat = useCallback(() => {
    setShowHistory(false);
    onNewChat();
  }, [onNewChat]);

  return {
    showHistory,
    onToggleHistory,
    onSelectThread: selectThread,
    onNewChat: newChat,
  };
}
