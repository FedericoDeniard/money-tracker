import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Suggestion } from "../ai-elements/suggestion";
import { AssistantInput } from "./AssistantInput";
import { AssistantHeader } from "./AssistantHeader";
import { AssistantLayout } from "./AssistantLayout";
import { QuickQuestions } from "./QuickQuestions";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useAssistantShell } from "../../hooks/useAssistantShell";
import { generateThreadId, queueAutoSend } from "../../lib/assistant-store";

const QUICK_QUESTIONS = [
  "topExpenses",
  "topIncome",
  "subscriptionsTotal",
  "savings",
] as const;

interface GreetingViewProps {
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  isReady: boolean;
}

export function GreetingView({
  onSelectThread,
  onNewChat,
  isReady,
}: GreetingViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const shell = useAssistantShell({ onSelectThread, onNewChat });

  return (
    <AssistantLayout activeThreadId={null} {...shell}>
      <AssistantHeader />

      <div className="w-full max-w-3xl mx-auto space-y-4 px-4 pb-4 lg:pb-8">
        <QuickQuestions>
          {QUICK_QUESTIONS.map(key => (
            <Suggestion
              key={key}
              suggestion={t(`assistant.quickQuestions.${key}`)}
              onClick={text => {
                const threadId = generateThreadId();
                queueAutoSend(threadId, { text, files: [] });
                navigate(`/assistant/${threadId}`);
              }}
            />
          ))}
        </QuickQuestions>

        {!isReady ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <AssistantInput
            resolveThreadId={generateThreadId}
            onSend={({ threadId, text, files }) => {
              queueAutoSend(threadId, { text, files });
              navigate(`/assistant/${threadId}`);
            }}
            showHistory={shell.showHistory}
            onToggleHistory={shell.onToggleHistory}
            placeholder={t("assistant.placeholder")}
          />
        )}
      </div>
    </AssistantLayout>
  );
}
