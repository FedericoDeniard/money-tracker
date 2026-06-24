import { useCallback, useState } from "react";

/**
 * Bumps a counter after a hard chat error so the parent can re-key
 * the ChatPanel and the useChat hook re-initialises from a clean state.
 * The setMessages approach alone is not enough — the hook keeps its own
 * internal stream history and will re-send the failed message part on
 * the next submission.
 */
export function useChatErrorRecovery() {
  const [chatInstance, setChatInstance] = useState(0);

  const trigger = useCallback(() => {
    setChatInstance(c => c + 1);
  }, []);

  return { chatInstance, trigger };
}
