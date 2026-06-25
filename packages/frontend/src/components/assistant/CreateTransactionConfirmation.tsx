import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Loader2,
  XIcon,
} from "lucide-react";
import type { ToolUIPart } from "ai";
import { Button } from "@/components/ui/Button";

type CreateTransactionTxn = {
  transaction_type?: "income" | "expense";
  name?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  transaction_date?: string;
  transaction_description?: string;
};

type CreateTransactionInput = {
  transactions: CreateTransactionTxn[];
};

type CreateTransactionOutputTxn = {
  id: string;
  transactionDate: string;
  name: string;
  merchant: string;
  amount: number;
  currency: string;
  transactionType: "income" | "expense";
  category: string;
};

type CreateTransactionOutput = {
  success: boolean;
  transactions: CreateTransactionOutputTxn[];
  totalCount: number;
  message: string;
};

type CreateTransactionToolUIPart = ToolUIPart<{
  createTransactionTool: {
    input: CreateTransactionInput;
    output: CreateTransactionOutput;
  };
}>;

interface CreateTransactionConfirmationProps {
  part: CreateTransactionToolUIPart;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const TOOL_DENIED_RESULT = "Tool call was not approved by the user";

/**
 * Mastra does not emit a `tool-output-denied` chunk on the wire for rejected
 * tools. See `node_modules/@mastra/core/dist/chunk-*.js` — the `execution-denied`
 * branch in the tool-call approval flow. It surfaces in the UI as either:
 *
 * - `output: { type: "execution-denied", reason?: string }` (live streaming)
 * - `output: "Tool call was not approved by the user"` (persisted / reloaded)
 */
function isExecutionDeniedOutput(output: unknown): boolean {
  if (typeof output === "string") {
    return output === TOOL_DENIED_RESULT;
  }
  if (output && typeof output === "object" && "type" in output) {
    return (output as { type: unknown }).type === "execution-denied";
  }
  return false;
}

export function CreateTransactionConfirmation({
  part,
  onApprove,
  onReject,
}: CreateTransactionConfirmationProps) {
  const { t, i18n } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const transactions = part.input?.transactions ?? [];
  const current = transactions[currentIndex] ?? transactions[0];
  const formattedAmount = useMemo(() => {
    if (!current || current.amount == null) return "—";
    return new Intl.NumberFormat(i18n.language, {
      style: "currency",
      currency: current.currency ?? "USD",
    }).format(current.amount);
  }, [current, i18n.language]);

  if (part.state === "input-streaming" || part.state === "input-available") {
    return null;
  }

  if (!part.input?.transactions || part.input.transactions.length === 0) {
    return null;
  }

  // Mastra does NOT emit a `tool-output-denied` chunk on the wire when a tool
  // is rejected. Instead it forwards a synthetic `tool-result` with
  // `output: { type: "execution-denied", reason: ... }` to the LLM and, on the
  // client, that lands here as `state: "output-available"` with the same
  // object on `output`. We also see the persisted form (`result: "Tool call
  // was not approved by the user"`) after reloading. Both mean "denied".
  const isDenied =
    part.state === "output-denied" ||
    (part.state === "output-available" && isExecutionDeniedOutput(part.output));
  const total = transactions.length;
  const showCarousel = total > 1;

  if (part.state === "approval-requested") {
    const approvalId = part.approval.id;
    const type = current.transaction_type;
    const isIncome = type === "income";
    const isExpense = type === "expense";
    const currency = current.currency ?? "USD";
    const amountDisplay =
      current.amount != null ? current.amount.toLocaleString() : "—";
    const amountValue = `${isIncome ? "+" : isExpense ? "-" : ""}${currency} ${amountDisplay}`;

    return (
      <article
        className="my-3 max-w-md rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm"
        aria-label={t("assistant.createTransaction.title", { count: total })}
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          {t("assistant.createTransaction.title", { count: total })}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          {t("assistant.createTransaction.subtitle", { count: total })}
        </p>

        {showCarousel && (
          <div className="flex items-center justify-center gap-1 mb-4">
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

        <div className="flex justify-center mb-4">
          <div
            className={`p-4 rounded-2xl ${
              isIncome
                ? "bg-green-100 text-green-600"
                : isExpense
                  ? "bg-red-100 text-red-600"
                  : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {isIncome ? (
              <ArrowDown strokeWidth={3} size={32} />
            ) : (
              <ArrowUp strokeWidth={3} size={32} />
            )}
          </div>
        </div>

        <div className="text-center mb-5">
          <p className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            {amountValue}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("assistant.createTransaction.amount")}
            </dt>
            <dd className="truncate font-medium text-[var(--text-primary)]">
              {amountValue}
            </dd>
          </div>
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
          {current.name && (
            <div className="col-span-2 min-w-0">
              <dt className="text-xs font-medium text-[var(--text-secondary)]">
                {t("assistant.createTransaction.name")}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {current.name}
              </dd>
            </div>
          )}
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

        <footer className="mt-5 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<XIcon size={16} />}
            onClick={() => onReject(approvalId)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<CheckIcon size={16} />}
            onClick={() => onApprove(approvalId)}
          >
            {t("common.confirm")}
          </Button>
        </footer>
      </article>
    );
  }

  if (part.state === "approval-responded") {
    const wasApproved = part.approval.approved !== false;
    const processingKey = wasApproved
      ? "assistant.createTransaction.processing"
      : "assistant.createTransaction.canceling";
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t(processingKey, { count: total })}
      >
        <Loader2
          className={`size-4 shrink-0 animate-spin ${
            wasApproved ? "text-[var(--text-secondary)]" : "text-rose-600"
          }`}
        />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t(processingKey, { count: total })}
        </span>
      </div>
    );
  }

  if (isDenied) {
    const summary = transactions
      .flatMap(t => [t.name, t.merchant].filter((v): v is string => !!v))
      .join(", ");
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t("assistant.createTransaction.rejected", { count: total })}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <XIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t("assistant.createTransaction.rejected", { count: total })}
          </p>
          {summary && (
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {summary}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t("assistant.createTransaction.error")}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
          <CircleAlert className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t("assistant.createTransaction.error")}
          </p>
          {part.errorText && (
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {part.errorText}
            </p>
          )}
        </div>
      </div>
    );
  }

  const summary = transactions
    .flatMap(t => [t.name, t.merchant].filter((v): v is string => !!v))
    .join(", ");
  return (
    <div
      className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
      aria-label={t("assistant.createTransaction.approved", { count: total })}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t("assistant.createTransaction.approved", { count: total })}
        </p>
        {summary && (
          <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}
