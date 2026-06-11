import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useConfig } from "../hooks/useConfig";
import { useChatThreads, useThreadMessages } from "../hooks/useChatThreads";
import { DecorativeSquare } from "../components/ui/DecorativeSquare";
import logo from "../logo.svg";
import {
  History,
  Repeat,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../components/ai-elements/prompt-input";
import {
  Conversation,
  ConversationContent,
} from "../components/ai-elements/conversation";
import { TooltipProvider } from "../components/ui/shadcn/tooltip";
import { HistoryList } from "../components/assistant/HistoryList";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { nanoid } from "nanoid";

/**
 * Generates a unique thread id. Uses crypto.randomUUID when available
 * (HTTPS / localhost) and falls back to nanoid otherwise.
 */
function generateThreadId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return nanoid();
}

const QUICK_QUESTIONS = [
  { id: "top-expenses", i18nKey: "topExpenses", icon: TrendingDown },
  { id: "top-income", i18nKey: "topIncome", icon: TrendingUp },
  { id: "subscriptions-total", i18nKey: "subscriptionsTotal", icon: Repeat },
  { id: "savings", i18nKey: "savings", icon: Wallet },
] as const;

type GreetingKey = "morning" | "afternoon" | "evening";

function getGreetingKey(hour: number): GreetingKey {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getDisplayName(user: ReturnType<typeof useAuth>["user"]): string {
  const metadata = user?.user_metadata as
    | { full_name?: string; name?: string }
    | undefined;
  const fullName = metadata?.full_name ?? metadata?.name;
  if (fullName) {
    const first = fullName.split(" ")[0]?.trim();
    if (first) return first;
  }
  const email = user?.email;
  if (email) {
    const local = email.split("@")[0];
    if (local) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return "";
}

function GreetingCurve() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -bottom-2 left-0 w-full text-[var(--accent)]"
      height="10"
      viewBox="0 0 200 10"
      preserveAspectRatio="none"
    >
      <path
        d="M2 6 Q 100 14 198 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

interface ChatPanelProps {
  apiUrl: string;
  accessToken: string;
  resourceId: string;
  initialThreadId: string | null;
  initialMessages: UIMessage[] | null;
  onMessageComplete: () => void;
}

/**
 * Owns the useChat hook. Mounted only when apiUrl + accessToken are known.
 */
function ChatPanel({
  apiUrl,
  accessToken,
  resourceId,
  initialThreadId,
  initialMessages,
  onMessageComplete,
}: ChatPanelProps) {
  const { t } = useTranslation();
  // threadId is read from this ref at request time so it's always
  // in sync with the latest send call, even if React state hasn't flushed.
  const threadIdRef = useRef<string | null>(initialThreadId);
  // Force a remount of the chat hook when the user explicitly switches
  // threads from the history panel. The new threadId becomes a key on
  // useChat (via `id`), which recreates the underlying Chat instance and
  // hydrates the messages from initialMessages.
  const [chatKey, setChatKey] = useState<string>(
    initialThreadId ?? `new-${Date.now()}`
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>(
    initialThreadId
  );

  // Sync parent-driven thread changes (history selection) into local state
  useEffect(() => {
    if (initialThreadId && initialThreadId !== threadIdRef.current) {
      threadIdRef.current = initialThreadId;
      setActiveThreadId(initialThreadId);
      setChatKey(initialThreadId);
    }
  }, [initialThreadId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl,
        headers: { Authorization: `Bearer ${accessToken}` },
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            memory: { thread: threadIdRef.current ?? "", resource: resourceId },
          },
        }),
      }),
    [apiUrl, accessToken, resourceId]
  );

  const { messages, sendMessage, status, setMessages, stop, error } = useChat({
    id: chatKey,
    transport,
    onError: err => {
      console.error("[Assistant] chat error", err);
    },
  });

  // Hydrate messages when the chat key changes (new thread selected)
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey]);

  // Refresh the thread list after a message completes
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (status === "streaming" || status === "submitted") {
      wasStreamingRef.current = true;
      return;
    }
    if (status === "ready" && wasStreamingRef.current) {
      wasStreamingRef.current = false;
      onMessageComplete();
    }
  }, [status, onMessageComplete]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!threadIdRef.current) {
      const id = generateThreadId();
      threadIdRef.current = id;
      setActiveThreadId(id);
    }
    sendMessage({ text: trimmed });
  };

  const hasMessages = messages.length > 0;

  return (
    <>
      {hasMessages && (
        <Conversation className="h-[50vh] rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] shadow-sm">
          <ConversationContent>
            {messages.map(message => {
              const text = message.parts
                .filter(p => p.type === "text")
                .map(p => (p as { text: string }).text)
                .join("");
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      isUser
                        ? "bg-[var(--button-primary)] text-white"
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              );
            })}
          </ConversationContent>
        </Conversation>
      )}

      <TooltipProvider delayDuration={0}>
        <PromptInputProvider>
          <PromptInput
            onSubmit={message => {
              handleSend(message.text);
            }}
            className="overflow-hidden rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] shadow-sm [&_[data-slot=input-group]]:!border-0"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={t("assistant.placeholder")}
                className="text-base"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                    <PromptInputActionAddScreenshot />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
              </PromptInputTools>
              <PromptInputSubmit status={status} onStop={stop} />
            </PromptInputFooter>
          </PromptInput>
        </PromptInputProvider>
      </TooltipProvider>

      {error && (
        <p className="text-center text-sm text-red-500">
          {t("assistant.errorGeneric", {
            message: error.message ?? t("assistant.errorUnknown"),
          })}
        </p>
      )}

      {!hasMessages && !activeThreadId && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_QUESTIONS.map(question => {
            const Icon = question.icon;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() =>
                  handleSend(t(`assistant.quickQuestions.${question.i18nKey}`))
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-4 py-1.5 text-sm text-[var(--text-primary)] transition-all hover:border-[var(--button-primary)] hover:bg-[var(--button-primary)]/10 hover:text-[var(--button-primary)]"
              >
                <Icon className="size-4" />
                {t(`assistant.quickQuestions.${question.i18nKey}`)}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export function Assistant() {
  const { t, i18n } = useTranslation();
  const { user, session, loading: authLoading } = useAuth();
  const { data: config, isLoading: configLoading } = useConfig();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const resourceId = user?.id ?? "anonymous";
  const { data: historyMessages } = useThreadMessages(threadId);
  const { refetch: refetchThreads } = useChatThreads();

  const handleNewChat = () => {
    setThreadId(null);
    setShowHistory(false);
  };

  const handleSelectThread = (id: string) => {
    setThreadId(id);
    setShowHistory(false);
  };

  // Hydrate messages on thread change
  const initialMessages = useMemo<UIMessage[] | null>(() => {
    if (!threadId || !historyMessages) return null;
    return historyMessages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: [{ type: "text" as const, text: m.content }],
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, historyMessages]);

  const isReady =
    !authLoading &&
    !configLoading &&
    !!config?.mastraServerUrl &&
    !!session?.access_token;

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const greeting = t(
    `assistant.greeting.${getGreetingKey(new Date().getHours())}`
  );
  const finalName = displayName || t("assistant.defaultName");

  return (
    <div
      className="flex flex-col items-center space-y-6 py-8 lg:py-12"
      key={i18n.language}
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <div className="relative size-10 flex items-center justify-center shrink-0">
            <DecorativeSquare size={40} className="absolute inset-0 m-auto" />
            <img
              src={logo}
              alt={t("assistant.logoAlt")}
              className="relative z-10 w-full h-full p-1.5 object-contain"
            />
          </div>
          <span className="text-2xl font-semibold text-[var(--text-primary)]">
            {t("assistant.brand")}
          </span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] tracking-tight text-center">
          {greeting},{" "}
          <span className="relative inline-block">
            {finalName}
            <GreetingCurve />
          </span>
        </h1>
      </div>

      <div className="w-full max-w-3xl space-y-4">
        <div className="flex justify-end">
          <TooltipProvider delayDuration={0}>
            <button
              type="button"
              onClick={() => setShowHistory(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--text-secondary)]/20 px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--button-primary)] hover:text-[var(--button-primary)]"
            >
              <History
                className={
                  showHistory
                    ? "size-3.5 text-[var(--button-primary)]"
                    : "size-3.5"
                }
              />
              <span>{t("assistant.history")}</span>
            </button>
          </TooltipProvider>
        </div>

        {showHistory && (
          <HistoryList
            activeThreadId={threadId}
            onSelect={handleSelectThread}
            onNewChat={handleNewChat}
          />
        )}

        {!isReady ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <ChatPanel
            apiUrl={`${config.mastraServerUrl}/chat/financial-agent`}
            accessToken={session.access_token}
            resourceId={resourceId}
            initialThreadId={threadId}
            initialMessages={initialMessages}
            onMessageComplete={() => refetchThreads()}
          />
        )}

        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t("assistant.disclaimer")}
        </p>
      </div>
    </div>
  );
}
