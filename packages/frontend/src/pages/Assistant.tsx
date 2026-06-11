import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useConfig } from "../hooks/useConfig";
import { useChatThreads, useThreadMessages } from "../hooks/useChatThreads";
import logo from "../logo.svg";
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
import { HistorySidebar } from "../components/assistant/HistorySidebar";
import { HistoryToggleButton } from "../components/assistant/HistoryToggleButton";
import { TypingIndicator } from "../components/assistant/TypingIndicator";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { nanoid } from "nanoid";
import { chatMessagesToUIMessages } from "../lib/mastra-messages";
import {
  LazyMotion,
  m,
  motion,
  AnimatePresence,
  domAnimation,
  useAnimate,
} from "framer-motion";

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

function navigateWithTransition(
  navigate: ReturnType<typeof useNavigate>,
  to: string
): void {
  navigate(to);
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

function AnimatedMessage({ children }: { children: React.ReactNode }) {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      scope.current,
      { opacity: 1, y: 0, scale: 1 },
      { duration: 0.25, ease: "easeOut" }
    );
  }, [animate, scope]);

  return (
    <div
      ref={scope}
      style={{ opacity: 0, transform: "translateY(20px) scale(0.95)" }}
    >
      {children}
    </div>
  );
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
  showHistory: boolean;
  onToggleHistory: () => void;
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
  showHistory,
  onToggleHistory,
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
  const initialMessageIdsRef = useRef(new Set(initialMessages.map(m => m.id)));

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
  const isThinking = status === "submitted" || status === "streaming";
  const lastMessage = messages.at(-1);
  const streamingAssistantId =
    isThinking && lastMessage?.role === "assistant" ? lastMessage.id : null;
  const showStandaloneTyping = isThinking && lastMessage?.role === "user";

  return (
    <>
      <Conversation className="relative min-h-0 flex-1 overflow-hidden">
        <ConversationContent className="gap-3 p-0 px-4 pt-4 pb-4 lg:pt-0 justify-end">
          {hasMessages ? (
            messages.map(message => {
              const text = message.parts
                .filter(p => p.type === "text")
                .map(p => (p as { text: string }).text)
                .join("");
              const isUser = message.role === "user";
              const showDots = message.id === streamingAssistantId;
              const isNewMessage = !initialMessageIdsRef.current.has(
                message.id
              );

              const messageContent = (
                <Message from={message.role} key={message.id}>
                  <MessageContent
                    className={
                      isUser
                        ? "group-[.is-user]:rounded-lg group-[.is-user]:bg-[var(--button-primary)] group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-white"
                        : "rounded-lg bg-[var(--accent)]/40 px-4 py-3 text-[var(--text-primary)]"
                    }
                  >
                    {isUser ? (
                      text
                    ) : (
                      <>
                        <MessageResponse>{text}</MessageResponse>
                        {showDots && <TypingIndicator />}
                      </>
                    )}
                  </MessageContent>
                </Message>
              );

              if (isNewMessage && isUser) {
                return (
                  <AnimatedMessage key={message.id}>
                    {messageContent}
                  </AnimatedMessage>
                );
              }

              return messageContent;
            })
          ) : (
            <ConversationEmptyState
              title={t("assistant.emptyChatHint")}
              className="text-[var(--text-secondary)]"
            />
          )}
          {showStandaloneTyping && (
            <Message from="assistant">
              <MessageContent className="rounded-lg bg-[var(--accent)]/40 px-4 py-3 text-[var(--text-primary)]">
                <TypingIndicator />
              </MessageContent>
            </Message>
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
                <HistoryToggleButton
                  show={showHistory}
                  onToggle={onToggleHistory}
                />
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
    <div className="flex h-[calc(100dvh-64px)] lg:h-[calc(100vh-16px)] flex-col gap-4">
      <HistorySidebar
        show={showHistory}
        activeThreadId={threadId}
        onSelect={id => {
          setShowHistory(false);
          navigate(`/assistant/${id}`);
        }}
        onNewChat={() => {
          setShowHistory(false);
          navigate("/assistant");
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
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
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory(v => !v)}
            />
          )}
        </div>
      </HistorySidebar>
      <p className="shrink-0 text-center text-xs text-[var(--text-secondary)]">
        {t("assistant.disclaimer")}
      </p>
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
  const [isHistoryAnimating, setIsHistoryAnimating] = useState(false);
  const prevShowHistory = useRef(showHistory);
  const hasHistoryInGreeting = showHistory || isHistoryAnimating;

  useLayoutEffect(() => {
    if (prevShowHistory.current === true && showHistory === false) {
      setIsHistoryAnimating(true);
    }
    prevShowHistory.current = showHistory;
  }, [showHistory]);

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
  if (threadIdParam && !isReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Greeting view: /assistant (no thread)
  const handleStartChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newId = generateThreadId();
    queueAutoSend(newId, trimmed);
    navigateWithTransition(navigate, `/assistant/${newId}`);
  };

  const viewKey = threadIdParam ? `chat-${threadIdParam}` : "greeting";

  return (
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={viewKey}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex h-[calc(100dvh-64px)] lg:h-[calc(100vh-16px)] flex-col"
        >
          <img
            src={logo}
            alt=""
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 lg:size-80 opacity-[0.06] grayscale pointer-events-none select-none"
          />

          {threadIdParam ? (
            <HistorySidebar
              show={showHistory}
              activeThreadId={threadIdParam}
              onSelect={id => {
                setShowHistory(false);
                navigate(`/assistant/${id}`);
              }}
              onNewChat={() => {
                setShowHistory(false);
                navigate("/assistant");
              }}
            >
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
            </HistorySidebar>
          ) : (
            <div
              className={`grid h-[calc(100dvh-64px)] lg:h-[calc(100vh-16px)] gap-4 ${hasHistoryInGreeting ? "grid-cols-[1fr_320px] grid-rows-[1fr_auto]" : "grid-cols-1 grid-rows-[1fr_auto]"}`}
            >
              {/* Contenido principal (greeting + prompt + suggestions) */}
              <div
                className={`${hasHistoryInGreeting ? "col-span-1 row-span-1" : "col-span-1 row-span-1"} flex min-h-0 flex-col`}
              >
                <div className="flex flex-1 items-center justify-center px-4 pt-8 pb-12 lg:pt-16 lg:pb-24">
                  <h1 className="text-5xl lg:text-6xl xl:text-7xl font-semibold text-[var(--text-primary)] tracking-tight text-center">
                    {greeting},{" "}
                    <span className="relative inline-block">
                      {finalName}
                      <GreetingCurve />
                    </span>
                  </h1>
                </div>

                <div className="w-full max-w-3xl mx-auto space-y-4 px-4 pb-4 lg:pb-8">
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
                              <HistoryToggleButton
                                show={showHistory}
                                onToggle={() => {
                                  setShowHistory(v => {
                                    if (!v) setIsHistoryAnimating(true);
                                    return !v;
                                  });
                                }}
                              />
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
                </div>
              </div>

              {/* Historial (solo cuando está abierto) */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onAnimationComplete={() => setIsHistoryAnimating(false)}
                    className="col-span-1 row-span-1 flex min-h-0 overflow-hidden"
                  >
                    <HistoryList
                      activeThreadId={null}
                      onSelect={id => {
                        setShowHistory(false);
                        navigate(`/assistant/${id}`);
                      }}
                      onNewChat={() => setShowHistory(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Disclaimer */}
              <div
                className={`${hasHistoryInGreeting ? "col-span-2" : "col-span-1"} row-span-1`}
              >
                <p className="text-center text-sm text-[var(--text-secondary)]">
                  {t("assistant.disclaimer")}
                </p>
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
