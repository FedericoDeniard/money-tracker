import { useTranslation } from "react-i18next";

/**
 * Parse a date string safely, handling date-only (YYYY-MM-DD) strings
 * as local time instead of UTC to avoid timezone shift.
 *
 * Postgres `DATE` columns return strings like "2026-07-01" with no timezone.
 * `new Date("2026-07-01")` treats that as midnight UTC, which shifts by
 * the local timezone offset and can display the previous day.
 */
export function parseDateSafe(dateString: string): Date {
  // YYYY-MM-DD (date-only, no time component) → parse as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  // Full ISO string with time/timezone → let Date handle it normally
  return new Date(dateString);
}

/**
 * Hook to format dates according to the current language
 */
export function useFormatDate() {
  const { i18n } = useTranslation();

  const formatDate = (dateString: string): string => {
    return parseDateSafe(dateString).toLocaleString(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatShortDate = (dateString: string, includeYear = false): string => {
    return parseDateSafe(dateString).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "short",
      ...(includeYear ? { year: "numeric" } : {}),
    });
  };

  const formatDateTime = (dateString: string): string => {
    const dateObj = parseDateSafe(dateString);
    return dateObj.toLocaleString(i18n.language, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return { formatDate, formatShortDate, formatDateTime };
}
