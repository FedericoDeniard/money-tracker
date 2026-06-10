import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
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
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../components/ai-elements/prompt-input";
import { TooltipProvider } from "../components/ui/shadcn/tooltip";

const QUICK_QUESTIONS = [
  {
    id: "top-expenses",
    i18nKey: "topExpenses",
    icon: TrendingDown,
  },
  {
    id: "top-income",
    i18nKey: "topIncome",
    icon: TrendingUp,
  },
  {
    id: "subscriptions-total",
    i18nKey: "subscriptionsTotal",
    icon: Repeat,
  },
  {
    id: "savings",
    i18nKey: "savings",
    icon: Wallet,
  },
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

export function Assistant() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const displayName = useMemo(() => getDisplayName(user), [user]);
  const greeting = t(
    `assistant.greeting.${getGreetingKey(new Date().getHours())}`
  );
  const finalName = displayName || t("assistant.defaultName");

  return (
    <div
      className="flex flex-col items-center justify-center space-y-12 py-16 lg:py-24"
      key={i18n.language}
    >
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

      <h1 className="text-5xl lg:text-6xl font-semibold text-[var(--text-primary)] tracking-tight text-center">
        {greeting},{" "}
        <span className="relative inline-block">
          {finalName}
          <GreetingCurve />
        </span>
      </h1>

      <div className="w-full max-w-3xl space-y-4">
        <TooltipProvider delayDuration={0}>
          <PromptInput
            onSubmit={() => {
              // Mock: no submission behavior
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
                <PromptInputButton tooltip={t("assistant.historyTooltip")}>
                  <History />
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit disabled status="ready" />
            </PromptInputFooter>
          </PromptInput>
        </TooltipProvider>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          {t("assistant.disclaimer")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_QUESTIONS.map(question => {
            const Icon = question.icon;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => {
                  // Mock: questions do not trigger any action
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-4 py-1.5 text-sm text-[var(--text-primary)] transition-all hover:border-[var(--button-primary)] hover:bg-[var(--button-primary)]/10 hover:text-[var(--button-primary)]"
              >
                <Icon className="size-4" />
                {t(`assistant.quickQuestions.${question.i18nKey}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
