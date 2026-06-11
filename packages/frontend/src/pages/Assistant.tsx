import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useConfig } from "../hooks/useConfig";
import { useChatThreads, useThreadMessages } from "../hooks/useChatThreads";
import { DecorativeSquare } from "../components/ui/DecorativeSquare";
import logo from "../logo.svg";
import { ArrowLeft, History } from "lucide-react";
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
  ConversationEmptyState,
} from "../components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "../components/ai-elements/message";
import { Suggestion, Suggestions } from "../components/ai-elements/suggestion";
import { TooltipProvider } from "../components/ui/shadcn/tooltip";
import { HistoryList } from "../components/assistant/HistoryList";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { nanoid } from "nanoid";
import { chatMessagesToUIMessages } from "../lib/mastra-messages";

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

/**
 * In-memory auto-send queue. Cleared on page reload so F5 never re-fires
 * the greeting prompt (sessionStorage persisted across reloads — root cause).
 */
const autoSendByThread = new Map<string, string>();
/** Prevents duplicate auto-send on React Strict Mode double-mount (same page session). */
const autoSendConsumedThreads = new Set<string>();

function queueAutoSend(threadId: string, text: string): void {
  autoSendByThread.set(threadId, text);
}

function consumeAutoSend(threadId: string): string | undefined {
  if (autoSendConsumedThreads.has(threadId)) return undefined;
  const text = autoSendByThread.get(threadId);
  if (text === undefined) return undefined;
  autoSendByThread.delete(threadId);
  autoSendConsumedThreads.add(threadId);
  return text;
}

function clearLegacyPendingStorage(threadId: string): void {
  try {
    sessionStorage.removeItem(`assistant:pending:${threadId}`);
    sessionStorage.removeItem(`assistant:pending-sent:${threadId}`);
    sessionStorage.removeItem(`assistant:auto-send:${threadId}`);
  } catch {
    // ignore
  }
}

const QUICK_QUESTIONS = [
  "topExpenses",
  "topIncome",
  "subscriptionsTotal",
  "savings",
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
  threadId: string;
  initialMessages: UIMessage[];
  onMessageComplete: () => void;
}

/**
 * Owns the useChat hook. Remounts whenever the threadId from the URL
 * changes (parent provides a new `key`), so each thread gets a fresh
 * Chat instance hydrated from initialMessages.
 */
function ChatPanel({
  apiUrl,
  accessToken,
  resourceId,
  threadId,
  initialMessages,
  onMessageComplete,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl,
        headers: { Authorization: `Bearer ${accessToken}` },
        prepareSendMessagesRequest: ({ messages }) => {
          const lastMessage = messages.at(-1);
          return {
            body: {
              // Mastra loads history from DB — send only the new message.
              // @see https://mastra.ai/guides/build-your-ui/ai-sdk-ui#using-mastra-memory
              messages: lastMessage ? [lastMessage] : [],
              memory: { thread: threadId, resource: resourceId },
            },
          };
        },
      }),
    [apiUrl, accessToken, resourceId, threadId]
  );

  // Snapshot DB messages at mount — useChat only reads `messages` in the constructor.
  // Parent must not refetch mid-session (would pass stale partial DB rows).
  const bootstrapMessagesRef = useRef(initialMessages);

  const { messages, sendMessage, status, stop, error } = useChat({
    id: threadId,
    transport,
    messages:
      bootstrapMessagesRef.current.length > 0
        ? bootstrapMessagesRef.current
        : undefined,
    onError: err => {
      console.error("[Assistant] chat error", err);
    },
  });

  useEffect(() => {
    clearLegacyPendingStorage(threadId);

    // Auto-send once for brand-new threads (in-memory queue, cleared on F5).
    if (bootstrapMessagesRef.current.length > 0) return;
    const text = consumeAutoSend(threadId);
    if (text) sendMessage({ text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

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

  const hasMessages = messages.length > 0;

  return (
    <>
      <Conversation className="flex-1 min-h-0 rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] shadow-sm">
        <ConversationContent>
          {hasMessages ? (
            messages.map(message => {
              const text = message.parts
                .filter(p => p.type === "text")
                .map(p => (p as { text: string }).text)
                .join("");
              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{text}</MessageResponse>
                    ) : (
                      text
                    )}
                  </MessageContent>
                </Message>
              );
            })
          ) : (
            <ConversationEmptyState
              title={t("assistant.emptyChatHint")}
              className="text-[var(--text-secondary)]"
            />
          )}
        </ConversationContent>
      </Conversation>

      <TooltipProvider delayDuration={0}>
        <PromptInputProvider>
          <PromptInput
            onSubmit={message => {
              const trimmed = message.text.trim();
              if (trimmed) sendMessage({ text: trimmed });
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
    </>
  );
}

interface ChatViewProps {
  threadId: string;
  apiUrl: string;
  accessToken: string;
  resourceId: string;
  initialMessages: UIMessage[] | null;
  onMessageComplete: () => void;
}

function ChatView({
  threadId,
  apiUrl,
  accessToken,
  resourceId,
  initialMessages,
  onMessageComplete,
}: ChatViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="flex h-[calc(100vh-2rem)] lg:h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/assistant")}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--text-secondary)]/20 px-3 py-1.5 text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--button-primary)] hover:text-[var(--button-primary)]"
            aria-label={t("assistant.back")}
          >
            <ArrowLeft className="size-3.5" />
            <span>{t("assistant.back")}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="relative size-7 flex items-center justify-center shrink-0">
              <DecorativeSquare size={28} className="absolute inset-0 m-auto" />
              <img
                src={logo}
                alt={t("assistant.logoAlt")}
                className="relative z-10 w-full h-full p-1 object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {t("assistant.brand")}
            </span>
          </div>
        </div>
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

      <div
        className={
          showHistory
            ? "flex flex-1 min-h-0 flex-col gap-4 md:grid md:grid-cols-[1fr_320px] md:gap-4"
            : "flex flex-1 min-h-0 flex-col gap-4"
        }
      >
        <div className="flex min-h-0 flex-col gap-4">
          {initialMessages === null ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <ChatPanel
              key={threadId}
              apiUrl={apiUrl}
              accessToken={accessToken}
              resourceId={resourceId}
              threadId={threadId}
              initialMessages={initialMessages}
              onMessageComplete={onMessageComplete}
            />
          )}
          <p className="text-center text-xs text-[var(--text-secondary)]">
            {t("assistant.disclaimer")}
          </p>
        </div>

        {showHistory && (
          <aside className="flex min-h-0 md:h-full md:overflow-hidden">
            <HistoryList
              activeThreadId={threadId}
              onSelect={id => {
                setShowHistory(false);
                navigate(`/assistant/${id}`);
              }}
              onNewChat={() => {
                setShowHistory(false);
                navigate("/assistant");
              }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export function Assistant() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { threadId: threadIdParam } = useParams<{ threadId: string }>();
  const { user, session, loading: authLoading } = useAuth();
  const { data: config, isLoading: configLoading } = useConfig();
  const [showHistory, setShowHistory] = useState(false);

  const resourceId = user?.id ?? "anonymous";
  const { data: historyMessages, isFetched: messagesFetched } =
    useThreadMessages(threadIdParam ?? null);
  const { refetch: refetchThreads } = useChatThreads();

  // Hydrate messages on thread change
  const initialMessages = useMemo<UIMessage[] | null>(() => {
    if (!threadIdParam || !messagesFetched) {
      return null;
    }
    const seenIds = new Set<string>();
    const deduped = (historyMessages ?? []).filter(m => {
      if (!m.id || seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });
    return chatMessagesToUIMessages(deduped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadIdParam, historyMessages, messagesFetched]);

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

  // Chat view: navigated to /assistant/:threadId
  if (threadIdParam) {
    if (!isReady) {
      return (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      );
    }
    return (
      <ChatView
        threadId={threadIdParam}
        apiUrl={`${config.mastraServerUrl}/chat/financial-agent`}
        accessToken={session.access_token}
        resourceId={resourceId}
        initialMessages={initialMessages}
        onMessageComplete={() => {
          void refetchThreads();
        }}
      />
    );
  }

  // Greeting view: /assistant (no thread)
  const handleStartChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newId = generateThreadId();
    queueAutoSend(newId, trimmed);
    navigate(`/assistant/${newId}`);
  };

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
            activeThreadId={null}
            onSelect={id => {
              setShowHistory(false);
              navigate(`/assistant/${id}`);
            }}
            onNewChat={() => setShowHistory(false)}
          />
        )}

        {!isReady ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <PromptInputProvider>
              <PromptInput
                onSubmit={message => handleStartChat(message.text)}
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
                  <PromptInputSubmit status="ready" />
                </PromptInputFooter>
              </PromptInput>
            </PromptInputProvider>
          </TooltipProvider>
        )}

        <Suggestions className="w-full">
          {QUICK_QUESTIONS.map(key => (
            <Suggestion
              key={key}
              suggestion={t(`assistant.quickQuestions.${key}`)}
              onClick={handleStartChat}
            />
          ))}
        </Suggestions>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t("assistant.disclaimer")}
        </p>
      </div>
    </div>
  );
}
