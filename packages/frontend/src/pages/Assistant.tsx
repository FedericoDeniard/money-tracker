import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../utils/toast";
import { getSupabase } from "../lib/supabase";
import { queryKeys } from "../lib/query-client";
import {
  useUploadChatAttachments,
  useDeleteChatAttachments,
} from "../hooks/useChatAttachments";
import type { ChatAttachment } from "../services/chat-attachments.service";
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
  usePromptInputAttachments,
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
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "../components/ai-elements/attachments";
import { HistoryList } from "../components/assistant/HistoryList";
import { HistorySidebar } from "../components/assistant/HistorySidebar";
import { HistoryToggleButton } from "../components/assistant/HistoryToggleButton";
import { TypingIndicator } from "../components/assistant/TypingIndicator";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ChatStatus, type UIMessage } from "ai";
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
interface QueuedAutoSend {
  text: string;
  files: Array<{
    type: "file";
    mediaType: string;
    filename: string;
    url: string;
  }>;
}

const autoSendByThread = new Map<string, QueuedAutoSend>();
/** Prevents duplicate auto-send on React Strict Mode double-mount (same page session). */
const autoSendConsumedThreads = new Set<string>();

function queueAutoSend(threadId: string, payload: QueuedAutoSend): void {
  autoSendByThread.set(threadId, payload);
}

function consumeAutoSend(threadId: string): QueuedAutoSend | undefined {
  if (autoSendConsumedThreads.has(threadId)) return undefined;
  const payload = autoSendByThread.get(threadId);
  if (payload === undefined) return undefined;
  autoSendByThread.delete(threadId);
  autoSendConsumedThreads.add(threadId);
  return payload;
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

interface AssistantPromptInputProps {
  resolveThreadId: () => string;
  onSend: (payload: {
    threadId: string;
    text: string;
    files: Array<{
      type: "file";
      mediaType: string;
      filename: string;
      url: string;
    }>;
  }) => void;
  onAttachmentsUploaded?: (attachments: ChatAttachment[]) => void;
  status?: ChatStatus;
  stop?: () => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  placeholder: string;
}

function AssistantPromptInput({
  resolveThreadId,
  onSend,
  onAttachmentsUploaded,
  status = "ready",
  stop,
  showHistory,
  onToggleHistory,
  placeholder,
}: AssistantPromptInputProps) {
  const {
    files: promptFiles,
    clear: clearPromptFiles,
    remove: removePromptFile,
  } = usePromptInputAttachments();
  const uploadAttachments = useUploadChatAttachments();

  return (
    <PromptInput
      onSubmit={async message => {
        const trimmed = message.text.trim();
        if (!trimmed && promptFiles.length === 0) return;

        const threadId = resolveThreadId();
        let uploaded: ChatAttachment[] = [];
        // Keep blobs around so we can produce inline data URLs when the
        // signed URL points to localhost (AI providers like Google AI
        // Studio cannot fetch private/localhost URLs).
        const blobs: Blob[] = [];
        if (promptFiles.length > 0) {
          const filesToUpload = await Promise.all(
            promptFiles.map(async f => {
              const response = await fetch(f.url);
              const blob = await response.blob();
              blobs.push(blob);
              return new File([blob], f.filename ?? "file", {
                type: f.mediaType ?? blob.type,
              });
            })
          );
          try {
            uploaded = await uploadAttachments.mutateAsync({
              threadId,
              files: filesToUpload,
            });
            onAttachmentsUploaded?.(uploaded);
          } catch (err) {
            console.error("[Assistant] attachment upload failed", err);
            return;
          }
        }

        const files = await Promise.all(
          uploaded.map(async (a, i) => {
            // Use the original blob to create a data URL when the signed
            // URL is a private/localhost address that the AI provider
            // cannot reach over the open internet.
            const url = new URL(a.signedUrl);
            if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
              const blob = blobs[i];
              return {
                type: "file" as const,
                mediaType: a.mime_type,
                filename: a.filename,
                url: await new Promise<string>(resolve => {
                  const r = new FileReader();
                  r.onloadend = () => resolve(r.result as string);
                  r.readAsDataURL(blob);
                }),
              };
            }
            return {
              type: "file" as const,
              mediaType: a.mime_type,
              filename: a.filename,
              url: a.signedUrl,
            };
          })
        );

        onSend({ threadId, text: trimmed, files });
        clearPromptFiles();
      }}
      className="overflow-hidden rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] shadow-sm [&_[data-slot=input-group]]:!border-0"
    >
      <PromptInputBody>
        {promptFiles.length > 0 && (
          <div
            data-align="block-start"
            className="order-first flex w-full flex-wrap items-end justify-start gap-2 px-3 pt-3"
          >
            {promptFiles.map(file => (
              <Attachment
                key={file.id}
                data={file}
                onRemove={() => removePromptFile(file.id)}
                className="bg-blue-500/10"
              >
                <AttachmentPreview />
                <AttachmentRemove className="bg-[var(--accent)] text-[var(--text-primary)] hover:bg-[var(--accent)]/80" />
              </Attachment>
            ))}
          </div>
        )}
        <PromptInputTextarea placeholder={placeholder} className="text-base" />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger className="bg-white" />
            <PromptInputActionMenuContent style={{ backgroundColor: "#fff" }}>
              <PromptInputActionAddAttachments />
              <PromptInputActionAddScreenshot />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <HistoryToggleButton show={showHistory} onToggle={onToggleHistory} />
        </PromptInputTools>
        <PromptInputSubmit status={status} onStop={stop} />
      </PromptInputFooter>
    </PromptInput>
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
  onHardError: () => void;
  onGreetingImageError?: () => void;
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
  onHardError,
  onGreetingImageError,
}: ChatPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
  // Track the most recent uploaded attachments so we can roll them back
  // (delete from storage + DB) if the model rejects the request.
  const pendingAttachmentsRef = useRef<ChatAttachment[]>([]);
  // Set to true only during the greeting auto-send (consumeAutoSend).
  // handleError checks this to decide whether to navigate back to
  // greeting on image errors — we cannot rely on bootstrapMessagesRef
  // because it captures initialMessages at mount time and never updates.
  const isGreetingAutoSendRef = useRef(false);
  // Captures the last user message we sent so the error handler can
  // remove it from the local message list — otherwise the failed prompt
  // stays on screen, the next send replays the same broken history,
  // and the empty assistant reply piles on top.
  const lastSentUserIdRef = useRef<string | null>(null);
  // Holds setMessages from useChat so the error handler (declared above
  // the hook call) can mutate the chat state.
  const setMessagesRef = useRef<
    | ((messages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])) => void)
    | null
  >(null);
  // Bumped after a hard error so the parent re-keys ChatPanel and the
  // useChat hook re-initialises from a clean state. The setMessages
  // approach alone was not enough — the hook was repopulating from its
  // own internal history and re-sending the failed file part on the
  // next submission.
  const deleteAttachments = useDeleteChatAttachments();

  const handleAttachmentsUploaded = useCallback(
    (attachments: ChatAttachment[]) => {
      pendingAttachmentsRef.current = attachments;
    },
    []
  );

  const handleError = useCallback(
    async (err: Error) => {
      console.error("[Assistant] chat error", err);
      const message = err instanceof Error ? err.message : String(err ?? "");
      const lower = message.toLowerCase();
      const isUnsupportedImageError =
        lower.includes("image input") ||
        lower.includes("does not support image") ||
        (lower.includes("vision") && lower.includes("support"));

      const setMessages = setMessagesRef.current;
      const lastId = lastSentUserIdRef.current;

      // ── Remove the offending user message from local state ──────────────
      if (setMessages) {
        setMessages(prev => {
          if (lastId) {
            const idx = prev.findIndex(m => m.id === lastId);
            if (idx === -1) return prev;
            return prev.slice(0, idx);
          }
          // Fallback (auto-send case where lastId was never set):
          // remove the last user message.
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === "user") {
              return prev.slice(0, i);
            }
          }
          return prev;
        });
        lastSentUserIdRef.current = null;
      }

      // ── Cleanup for unsupported-image errors ──────────────────────────
      if (isUnsupportedImageError) {
        const supabase = await getSupabase();

        // Best-effort: delete the offending message from Mastra memory by
        // its client-generated ID. In the chat-view flow the message is
        // persisted synchronously by Mastra so this delete succeeds.
        // In the greeting auto-send flow the write is async — the
        // navigation fix below (@see onGreetingImageError) handles that
        // case by abandoning the thread entirely.
        if (lastId) {
          const { error: delErr } = await supabase
            .from("mastra_messages")
            .delete()
            .eq("id", lastId);
          if (delErr) {
            console.error(
              "[Assistant] failed to delete message from Mastra memory",
              delErr
            );
          } else {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.chatThreads.messages(threadId),
            });
          }
        }

        // Roll back the uploaded attachments (storage + metadata).
        const pending = pendingAttachmentsRef.current;
        if (pending.length > 0) {
          void deleteAttachments.mutateAsync(pending).catch(e => {
            console.error(
              "[Assistant] failed to roll back attachments after provider error",
              e
            );
          });
          pendingAttachmentsRef.current = [];
        }

        toast.error(t("assistant.imageNotSupported"));
      } else {
        toast.error(
          t("assistant.errorGeneric", {
            message:
              err instanceof Error ? err.message : t("assistant.errorUnknown"),
          })
        );
      }

      // ── Decide what to do after the error ──────────────────────────────
      // Greeting auto-send: the thread was just created. Mastra caches the
      // image message asynchronously and will re-send it on the next
      // request, causing the same error. Navigate back to the greeting
      // view so the next message creates a brand-new thread.
      // Chat-view error: remount the ChatPanel (existing behavior).
      if (isUnsupportedImageError && isGreetingAutoSendRef.current) {
        isGreetingAutoSendRef.current = false;
        onGreetingImageError?.();
      } else {
        onHardError();
      }
    },
    [
      deleteAttachments,
      onHardError,
      onGreetingImageError,
      t,
      queryClient,
      threadId,
    ]
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: threadId,
    transport,
    messages:
      bootstrapMessagesRef.current.length > 0
        ? bootstrapMessagesRef.current
        : undefined,
    onError: handleError,
  });
  setMessagesRef.current = setMessages;
  // Always-current snapshot of messages for the send wrapper's microtask.
  // Capturing `messages` directly in the closure would freeze the value
  // at callback creation time and miss the optimistic update.
  const messagesRef = useRef<UIMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages, status]);

  // Track the most recent user message so the error handler can remove
  // it. `sendMessage` adds the optimistic message to `messages` before
  // the network call resolves, so we capture the id from there.
  const wrappedSendMessage = useCallback(
    (msg: Parameters<typeof sendMessage>[0]) => {
      sendMessage(msg);
      // Defer to next tick so the optimistic message is in `messages`.
      queueMicrotask(() => {
        const lastUser = [...messagesRef.current]
          .reverse()
          .find(m => m.role === "user");
        if (lastUser) {
          lastSentUserIdRef.current = lastUser.id;
        }
      });
    },
    [sendMessage]
  );

  // Drop the pending-attachments list once the assistant has successfully
  // responded to that user message — at that point the upload is "used".
  // Also clears the greeting-auto-send flag so subsequent image errors in
  // this thread are handled via the normal hard-error (remount) flow.
  useEffect(() => {
    if (status === "ready") {
      if (pendingAttachmentsRef.current.length > 0) {
        pendingAttachmentsRef.current = [];
        lastSentUserIdRef.current = null;
      }
      if (isGreetingAutoSendRef.current) {
        isGreetingAutoSendRef.current = false;
      }
    }
  }, [status, messages.length]);

  useEffect(() => {
    clearLegacyPendingStorage(threadId);

    // Auto-send once for brand-new threads (in-memory queue, cleared on F5).
    if (bootstrapMessagesRef.current.length > 0) return;
    const payload = consumeAutoSend(threadId);
    if (payload) {
      // Flag for handleError: this message was sent via greeting auto-send.
      // Cleared in the "ready" effect after a successful round-trip, or
      // in handleError when navigating back to the greeting on error.
      isGreetingAutoSendRef.current = true;
      if (payload.files.length > 0) {
        wrappedSendMessage({ text: payload.text, files: payload.files });
      } else if (payload.text) {
        wrappedSendMessage({ text: payload.text });
      }
    }
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
                      <>
                        {message.files && message.files.length > 0 && (
                          <Attachments
                            variant="grid"
                            className="mb-2 [button]:hidden"
                          >
                            {message.files.map(file => (
                              <Attachment
                                key={file.url}
                                data={
                                  {
                                    ...file,
                                    id: file.url,
                                  } as never
                                }
                              >
                                <AttachmentPreview />
                              </Attachment>
                            ))}
                          </Attachments>
                        )}
                        {text}
                      </>
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
          <AssistantPromptInput
            resolveThreadId={() => threadId}
            onSend={({ text, files }) => {
              if (files.length > 0) {
                wrappedSendMessage({ text, files });
              } else {
                wrappedSendMessage({ text });
              }
            }}
            onAttachmentsUploaded={handleAttachmentsUploaded}
            status={status}
            stop={stop}
            showHistory={showHistory}
            onToggleHistory={onToggleHistory}
            placeholder={t("assistant.placeholder")}
          />
        </PromptInputProvider>
      </TooltipProvider>

      {error &&
        (() => {
          const msg = error.message ?? "";
          const lower = msg.toLowerCase();
          const isUnsupportedImage =
            lower.includes("image input") ||
            lower.includes("does not support image") ||
            (lower.includes("vision") && lower.includes("support"));
          // The toast for image-not-supported handles UX feedback; don't
          // also render the long message inline (it overflows the prompt
          // area and looks like a layout break).
          if (isUnsupportedImage) return null;
          return (
            <p className="text-center text-sm text-red-500">
              {t("assistant.errorGeneric", {
                message: msg || t("assistant.errorUnknown"),
              })}
            </p>
          );
        })()}
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
  onHardError: () => void;
  onGreetingImageError?: () => void;
  panelKey: string;
}

function ChatView({
  threadId,
  apiUrl,
  accessToken,
  resourceId,
  initialMessages,
  onMessageComplete,
  onHardError,
  onGreetingImageError,
  panelKey,
}: ChatViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-64px)] lg:h-[calc(100vh-16px)] flex-col">
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
        <div className="relative flex min-h-0 flex-1 flex-col">
          <img
            src={logo}
            alt=""
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 lg:size-80 opacity-[0.06] grayscale pointer-events-none select-none"
          />
          {initialMessages === null ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <ChatPanel
              key={panelKey}
              apiUrl={apiUrl}
              accessToken={accessToken}
              resourceId={resourceId}
              threadId={threadId}
              initialMessages={initialMessages}
              onMessageComplete={onMessageComplete}
              showHistory={showHistory}
              onToggleHistory={() => setShowHistory(v => !v)}
              onHardError={onHardError}
              onGreetingImageError={onGreetingImageError}
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
  // Bumped after a hard chat error so ChatPanel remounts with a fresh
  // useChat instance. The hook keeps its own internal stream history,
  // so a setMessages call alone is not enough to stop it from
  // re-sending the failed file part on the next submission.
  const [chatInstance, setChatInstance] = useState(0);
  // Used implicitly through the `key` prop on ChatPanel below.
  void chatInstance;
  // Pass the increment through a stable callback so the linter sees
  // the setter as used even though it's only invoked by ChatPanel.
  const handleHardError = useCallback(() => {
    setChatInstance(c => c + 1);
  }, []);
  void handleHardError;

  // When an image error occurs from the greeting auto-send (brand-new
  // thread with no history), we navigate back to the greeting view so
  // the next user message creates a fresh thread. Mastra's async memory
  // persistence means the offending message would otherwise be re-sent
  // to the model on every subsequent request.
  const handleGreetingImageError = useCallback(() => {
    navigate("/assistant");
  }, [navigate]);
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
                onHardError={handleHardError}
                onGreetingImageError={handleGreetingImageError}
                panelKey={`${threadIdParam}-${chatInstance}`}
              />
            </HistorySidebar>
          ) : (
            <div
              className={`grid h-[calc(100dvh-64px)] lg:h-[calc(100vh-16px)] gap-4 ${hasHistoryInGreeting ? "grid-cols-[1fr_320px] grid-rows-[1fr_auto]" : "grid-cols-1 grid-rows-[1fr_auto]"}`}
            >
              {/* Contenido principal (greeting + prompt + suggestions) */}
              <div
                className={`${hasHistoryInGreeting ? "col-span-1 row-span-1" : "col-span-1 row-span-1"} relative flex min-h-0 flex-col`}
              >
                <img
                  src={logo}
                  alt=""
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 lg:size-80 opacity-[0.06] grayscale pointer-events-none select-none"
                />
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
                        <AssistantPromptInput
                          resolveThreadId={generateThreadId}
                          onSend={({ threadId, text, files }) => {
                            queueAutoSend(threadId, { text, files });
                            navigateWithTransition(
                              navigate,
                              `/assistant/${threadId}`
                            );
                          }}
                          showHistory={showHistory}
                          onToggleHistory={() => {
                            setShowHistory(v => {
                              if (!v) setIsHistoryAnimating(true);
                              return !v;
                            });
                          }}
                          placeholder={t("assistant.placeholder")}
                        />
                      </PromptInputProvider>
                    </TooltipProvider>
                  )}

                  <Suggestions className="w-full">
                    {QUICK_QUESTIONS.map(key => (
                      <Suggestion
                        key={key}
                        suggestion={t(`assistant.quickQuestions.${key}`)}
                        onClick={text => {
                          const threadId = generateThreadId();
                          queueAutoSend(threadId, { text, files: [] });
                          navigateWithTransition(
                            navigate,
                            `/assistant/${threadId}`
                          );
                        }}
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
