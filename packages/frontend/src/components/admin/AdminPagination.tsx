import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  className?: string;
}

/**
 * Page controls for the admin tables. Shows the current range and a
 * prev/next pair. Disables prev on page 0 and next when there is no
 * more data (`(page + 1) * pageSize >= total`).
 */
export function AdminPagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationProps) {
  const { t } = useTranslation();
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);
  const hasPrev = page > 0;
  const hasNext = end < total;

  return (
    <div
      className={`flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)] ${className ?? ""}`}
    >
      <span>
        {total === 0
          ? t("admin.pagination.empty")
          : t("admin.pagination.range", { start, end, total })}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-1.5 font-medium transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--bg-primary)] disabled:hover:text-[var(--text-secondary)]"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          {t("admin.pagination.previous")}
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] px-3 py-1.5 font-medium transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[var(--bg-primary)] disabled:hover:text-[var(--text-secondary)]"
        >
          {t("admin.pagination.next")}
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
