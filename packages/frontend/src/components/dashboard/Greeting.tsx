import { useTranslation } from "react-i18next";
import { formatMonthLabel, currentYearMonth } from "../../utils/period";

interface GreetingProps {
  now?: Date;
}

function getTimeOfDay(date: Date): "morning" | "afternoon" | "evening" {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

export function Greeting({ now = new Date() }: GreetingProps) {
  const { t, i18n } = useTranslation();
  const timeOfDay = getTimeOfDay(now);
  const monthLabel = formatMonthLabel(currentYearMonth(), i18n.language);

  const day = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const monthProgress = Math.round((day / daysInMonth) * 100);

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
        {t(`dashboardOverview.greeting.${timeOfDay}`)}
      </h1>
      <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
        {t("dashboardOverview.greeting.monthlyTag", { month: monthLabel })}
        {" · "}
        {t("dashboardOverview.greeting.dayProgress", {
          day,
          total: daysInMonth,
          percent: monthProgress,
        })}
      </p>
    </div>
  );
}
