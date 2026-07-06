import {
  ArrowDown,
  ArrowUp,
  XIcon,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { TagBadge } from "../tags/TagBadge";
import type { Tag } from "../../types/tags";

export interface ApprovalCardTxn {
  transaction_type?: "income" | "expense";
  name?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  transaction_date?: string;
  transaction_description?: string;
  tag_ids?: string[];
}

interface CreateTransactionApprovalCardProps {
  current: ApprovalCardTxn;
  total: number;
  showCarousel: boolean;
  currentIndex: number;
  resolvedTags: Tag[];
  approvalId: string;
  onPrev: () => void;
  onNext: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function CreateTransactionApprovalCard({
  current,
  total,
  showCarousel,
  currentIndex,
  resolvedTags,
  approvalId,
  onPrev,
  onNext,
  onApprove,
  onReject,
}: CreateTransactionApprovalCardProps) {
  const { t } = useTranslation();

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
            onClick={onPrev}
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
            onClick={onNext}
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
        {resolvedTags.length > 0 && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("tags.title", "Tags")}
            </dt>
            <dd className="flex flex-wrap gap-1.5 mt-1">
              {resolvedTags.map(tag => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  size="sm"
                />
              ))}
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
