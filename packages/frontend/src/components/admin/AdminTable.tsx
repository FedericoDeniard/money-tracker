import type { ReactNode } from "react";

interface AdminTableProps<TRow> {
  columns: Array<{
    key: string;
    label: string;
    render: (row: TRow) => ReactNode;
    className?: string;
  }>;
  rows: TRow[];
  loading: boolean;
  error?: Error | null;
  emptyMessage: string;
  rowKey: (row: TRow) => string;
  onRowClick?: (row: TRow) => void;
}

export function AdminTable<TRow>({
  columns,
  rows,
  loading,
  error,
  emptyMessage,
  rowKey,
  onRowClick,
}: AdminTableProps<TRow>) {
  if (loading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-8 text-center text-sm text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-8 text-center text-sm text-red-700">
        {error.message}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-8 text-center text-sm text-[var(--text-secondary)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-secondary)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                scope="col"
                className={col.className ?? "px-4 py-3"}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--text-secondary)]/10">
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={
                onRowClick
                  ? "cursor-pointer transition-colors hover:bg-[var(--bg-secondary)]"
                  : undefined
              }
            >
              {columns.map(col => (
                <td key={col.key} className={col.className ?? "px-4 py-3"}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
