import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

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

type GreetingKey = "morning" | "afternoon" | "evening";

function getGreetingKey(hour: number): GreetingKey {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

interface AssistantHeaderProps {
  /** Centered greeting headline. Replaces the inline h1 + GreetingCurve block. */
  size?: "sm" | "md" | "lg";
}

export function AssistantHeader({ size = "lg" }: AssistantHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const greeting = t(
    `assistant.greeting.${getGreetingKey(new Date().getHours())}`
  );
  const displayName = getDisplayName(user);
  const finalName = displayName || t("assistant.defaultName");

  const sizeClass =
    size === "sm"
      ? "text-3xl"
      : size === "md"
        ? "text-5xl"
        : "text-5xl lg:text-6xl xl:text-7xl";

  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-8 pb-12 lg:pt-16 lg:pb-24">
      <h1
        className={`${sizeClass} font-semibold text-[var(--text-primary)] tracking-tight text-center`}
      >
        {greeting},{" "}
        <span className="relative inline-block">
          {finalName}
          <GreetingCurve />
        </span>
      </h1>
    </div>
  );
}
