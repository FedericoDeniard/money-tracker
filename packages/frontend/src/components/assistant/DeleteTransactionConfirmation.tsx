import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";
import type { ToolUIPart } from "ai";
import { getSupabase } from "../../lib/supabase";
import { Button } from "@/components/ui/Button";
import { ToolApprovalCard } from "./ToolApprovalCard";

type DeleteTransactionInput = {
  transactionIds: string[];
  reason?: string;
};

type DeleteTransactionToolUIPart = ToolUIPart<{
  deleteTransactionTool: {
    input: DeleteTransactionInput;
    output: unknown;
  };
}>;

interface DeleteTransactionConfirmationProps {
  part: DeleteTransactionToolUIPart;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

interface TransactionDetail {
  id: string;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  transaction_date: string | null;
  transaction_type: string | null;
  category: string | null;
  transaction_description: string | null;
}

export function DeleteTransactionConfirmation({
  part,
  onApprove,
  onReject,
}: DeleteTransactionConfirmationProps) {
  const { t } = useTranslation();
  const [details, setDetails] = useState<TransactionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const input = part.input;
  const ids = input?.transactionIds ?? [];
  const reason = input?.reason;
  const count = ids.length;

  useEffect(() => {
    if (part.state !== "approval-requested") return;
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, merchant, amount, currency, transaction_date, transaction_type, category, transaction_description"
        )
        .in("id", ids)
        .eq("discarded", false)
        .order("transaction_date", { ascending: false });

      if (cancelled) return;
      if (error) {
        setDetails([]);
      } else {
        setDetails((data ?? []) as unknown as TransactionDetail[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [part.state, ids.length]);

  const summary = details
    .map(d => d.merchant)
    .filter(Boolean)
    .join(", ");

  const total = details.length;
  const showCarousel = total > 1;
  const current = details[currentIndex] ?? details[0];

  const approvalContent = loading ? (
    <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-secondary)]">
      <Loader2 className="size-4 animate-spin" />
      {t("assistant.deleteTransaction.loadingDetails")}
    </div>
  ) : details.length === 0 ? (
    <p className="py-4 text-sm text-[var(--text-secondary)]">
      {t("assistant.deleteTransaction.notFound", { count })}
    </p>
  ) : (
    <>
      {showCarousel && (
        <div className="mb-4 flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            aria-label={t("assistant.createTransaction.previous")}
            icon={<ChevronLeft size={16} />}
          />
          <span className="min-w-12 text-center text-sm tabular-nums text-[var(--text-secondary)]">
            {t("assistant.createTransaction.counter", {
              current: currentIndex + 1,
              total,
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
            disabled={currentIndex === total - 1}
            aria-label={t("assistant.createTransaction.next")}
            icon={<ChevronRight size={16} />}
          />
        </div>
      )}

      <div className="mb-4 flex justify-center">
        <div
          className={`p-4 rounded-2xl ${
            current.transaction_type === "income"
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {current.transaction_type === "income" ? (
            <ArrowDown strokeWidth={3} size={32} />
          ) : (
            <ArrowUp strokeWidth={3} size={32} />
          )}
        </div>
      </div>

      <div className="mb-5 text-center">
        <p className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          {`${current.transaction_type === "income" ? "+" : "-"}${current.currency ?? "USD"} ${
            current.amount != null ? current.amount.toLocaleString() : "—"
          }`}
        </p>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="min-w-0">
          <dt className="text-xs font-medium text-[var(--text-secondary)]">
            {t("assistant.createTransaction.merchant")}
          </dt>
          <dd className="truncate font-medium text-[var(--text-primary)]">
            {current.merchant ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium text-[var(--text-secondary)]">
            {t("assistant.createTransaction.category")}
          </dt>
          <dd className="truncate font-medium text-[var(--text-primary)]">
            {current.category ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium text-[var(--text-secondary)]">
            {t("assistant.createTransaction.date")}
          </dt>
          <dd className="truncate font-medium text-[var(--text-primary)]">
            {current.transaction_date ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium text-[var(--text-secondary)]">
            {t("assistant.createTransaction.type")}
          </dt>
          <dd className="truncate font-medium text-[var(--text-primary)]">
            {current.transaction_type
              ? t(
                  `assistant.createTransaction.types.${current.transaction_type}`
                )
              : "—"}
          </dd>
        </div>
        {current.transaction_description && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("assistant.createTransaction.description")}
            </dt>
            <dd className="font-medium text-[var(--text-primary)]">
              {current.transaction_description}
            </dd>
          </div>
        )}
      </dl>

      {reason && (
        <p className="text-xs text-[var(--text-secondary)]">
          <span className="font-medium">
            {t("assistant.deleteTransaction.reason")}:
          </span>{" "}
          {reason}
        </p>
      )}
    </>
  );

  return (
    <ToolApprovalCard
      part={part}
      onApprove={onApprove}
      onReject={onReject}
      i18nPrefix="assistant.deleteTransaction"
      count={count}
      summary={summary}
      confirmVariant="danger"
      confirmIcon={<Trash2 size={16} />}
    >
      {approvalContent}
    </ToolApprovalCard>
  );
}
