import { useTranslation } from 'react-i18next';

/**
 * Hook to format dates according to the current language
 */
export function useFormatDate() {
  const { i18n } = useTranslation();

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatShortDate = (dateString: string, includeYear = false): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    });
  };

  const formatDateTime = (dateString: string): string => {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString(i18n.language, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return { formatDate, formatShortDate, formatDateTime };
}
