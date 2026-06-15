import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  ArrowUp,
  CheckIcon,
  CircleAlert,
  Loader2,
  XIcon,
} from "lucide-react";
import type { ToolUIPart } from "ai";
import { Button } from "@/components/ui/Button";

type CreateTransactionInput = {
  transaction_type?: "income" | "expense";
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  transaction_date?: string;
  transaction_description?: string;
};

type CreateTransactionOutput = {
  success: boolean;
  transaction: {
    id: string;
    transactionDate: string;
    merchant: string;
    amount: number;
    currency: string;
    transactionType: "income" | "expense";
    category: string;
  } | null;
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

export function CreateTransactionConfirmation({
  part,
  onApprove,
  onReject,
}: CreateTransactionConfirmationProps) {
  const { t, i18n } = useTranslation();

  if (part.state === "input-streaming" || part.state === "input-available") {
    return null;
  }

  if (!part.input) return null;
  const input = part.input;
  const type = input.transaction_type;
  const isIncome = type === "income";
  const isExpense = type === "expense";

  const amountDisplay =
    input.amount != null ? input.amount.toLocaleString() : "—";
  const currency = input.currency ?? "USD";
  const amountValue = `${isIncome ? "+" : isExpense ? "-" : ""}${currency} ${amountDisplay}`;
  const formattedAmount =
    input.amount != null
      ? new Intl.NumberFormat(i18n.language, {
          style: "currency",
          currency: input.currency ?? "USD",
        }).format(input.amount)
      : "—";

  if (part.state === "approval-requested") {
    const approvalId = part.approval.id;

    return (
      <article
        className="my-3 max-w-md rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm"
        aria-label={t("assistant.createTransaction.title")}
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          {t("assistant.createTransaction.title")}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5">
          {t("assistant.createTransaction.subtitle")}
        </p>

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
              {input.merchant ?? "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("assistant.createTransaction.category")}
            </dt>
            <dd className="truncate font-medium text-[var(--text-primary)]">
              {input.category ?? "—"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("assistant.createTransaction.date")}
            </dt>
            <dd className="truncate font-medium text-[var(--text-primary)]">
              {input.transaction_date ?? "—"}
            </dd>
          </div>
          {input.transaction_description && (
            <div className="col-span-2 min-w-0">
              <dt className="text-xs font-medium text-[var(--text-secondary)]">
                {t("assistant.createTransaction.description")}
              </dt>
              <dd className="font-medium text-[var(--text-primary)]">
                {input.transaction_description}
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
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t("assistant.createTransaction.processing")}
      >
        <Loader2 className="size-4 shrink-0 animate-spin text-[var(--text-secondary)]" />
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {t("assistant.createTransaction.processing")}
        </span>
      </div>
    );
  }

  if (part.state === "output-denied") {
    return (
      <div
        className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
        aria-label={t("assistant.createTransaction.rejected")}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <XIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t("assistant.createTransaction.rejected")}
          </p>
          {input.merchant && (
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {input.merchant} <span className="text-zinc-300">•</span>{" "}
              {formattedAmount}
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

  return (
    <div
      className="my-3 flex w-full max-w-md items-center gap-3 rounded-xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4"
      aria-label={t("assistant.createTransaction.approved")}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <CheckIcon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t("assistant.createTransaction.approved")}
        </p>
        {input.merchant && (
          <p className="truncate text-xs text-[var(--text-secondary)]">
            {input.merchant} <span className="text-zinc-300">•</span>{" "}
            {formattedAmount}
          </p>
        )}
      </div>
    </div>
  );
}
