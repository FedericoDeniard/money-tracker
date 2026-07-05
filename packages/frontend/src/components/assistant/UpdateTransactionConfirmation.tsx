import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, CheckIcon, Loader2, XIcon } from "lucide-react";
import type { ToolUIPart } from "ai";
import { getSupabase } from "../../lib/supabase";
import { Button } from "@/components/ui/Button";
import { ToolApprovalCard } from "./ToolApprovalCard";
import { TagBadge } from "../tags/TagBadge";
import { useTags } from "../../hooks/useTags";
import type { Tag } from "../../types/tags";

type UpdateFields = {
  category?: string;
  name?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  transaction_description?: string;
  transaction_type?: "income" | "expense";
  transaction_date?: string;
  tag_ids?: string[];
};

type UpdateTransactionInput = {
  transactionId: string;
  updates: UpdateFields;
};

type UpdateTransactionToolUIPart = ToolUIPart<{
  updateTransactionTool: {
    input: UpdateTransactionInput;
    output: unknown;
  };
}>;

interface UpdateTransactionConfirmationProps {
  part: UpdateTransactionToolUIPart;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

interface TransactionDetail {
  id: string;
  name: string | null;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  transaction_date: string | null;
  transaction_type: string | null;
  category: string | null;
  transaction_description: string | null;
}

interface TagLookup {
  id: string;
  name: string;
  color: Tag["color"];
}

const FIELD_LABELS: Partial<Record<keyof UpdateFields, string>> = {
  category: "assistant.createTransaction.category",
  name: "assistant.createTransaction.name",
  merchant: "assistant.createTransaction.merchant",
  amount: "assistant.createTransaction.amount",
  currency: "assistant.updateTransaction.fields.currency",
  transaction_description: "assistant.createTransaction.description",
  transaction_type: "assistant.createTransaction.type",
  transaction_date: "assistant.createTransaction.date",
};

function formatValue(
  field: keyof UpdateFields,
  value: string | number | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (field === "amount" && typeof value === "number") {
    return value.toLocaleString();
  }
  if (field === "transaction_type" && typeof value === "string") {
    return t(`assistant.createTransaction.types.${value}`);
  }
  return String(value);
}

export function UpdateTransactionConfirmation({
  part,
  onApprove,
  onReject,
}: UpdateTransactionConfirmationProps) {
  const { t, i18n } = useTranslation();
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [currentTagIds, setCurrentTagIds] = useState<string[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const { data: allTags = [] } = useTags();
  const tagsById = useMemo(
    () => new Map(allTags.map(tag => [tag.id, tag])),
    [allTags]
  );

  const input = part.input;
  const transactionId = input?.transactionId ?? "";
  const updates = input?.updates ?? {};
  const loading = transactionId !== "" && fetchLoading;

  const changedFields = Object.keys(updates).filter(
    (k): k is keyof UpdateFields =>
      updates[k as keyof UpdateFields] !== undefined &&
      updates[k as keyof UpdateFields] !== null
  );

  useEffect(() => {
    if (part.state !== "approval-requested") return;
    if (!transactionId) return;

    let cancelled = false;
    void (async () => {
      const supabase = await getSupabase();
      const [detailRes, tagsRes] = await Promise.all([
        supabase
          .from("transactions")
          .select(
            "id, name, merchant, amount, currency, transaction_date, transaction_type, category, transaction_description"
          )
          .eq("id", transactionId)
          .eq("discarded", false)
          .single(),
        supabase
          .from("transaction_tags")
          .select("tag_id")
          .eq("transaction_id", transactionId),
      ]);

      if (cancelled) return;
      if (detailRes.error) {
        setDetail(null);
      } else {
        setDetail(detailRes.data as unknown as TransactionDetail);
      }
      setCurrentTagIds(
        ((tagsRes.data ?? []) as unknown as Array<{ tag_id: string }>).map(
          r => r.tag_id
        )
      );
      setFetchLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [part.state, transactionId]);

  const tagsChanged = updates.tag_ids !== undefined;
  const nextTagIds: string[] = updates.tag_ids ?? currentTagIds;
  const addedTagIds: string[] = tagsChanged
    ? nextTagIds.filter(id => !currentTagIds.includes(id))
    : [];
  const removedTagIds: string[] = tagsChanged
    ? currentTagIds.filter(id => !nextTagIds.includes(id))
    : [];
  const addedTags = addedTagIds
    .map((id): Tag | undefined => tagsById.get(id))
    .filter((t): t is Tag => !!t);
  const removedTags = removedTagIds
    .map((id): Tag | undefined => tagsById.get(id))
    .filter((t): t is Tag => !!t);
  const finalTags = nextTagIds
    .map((id): Tag | undefined => tagsById.get(id))
    .filter((t): t is Tag => !!t);

  const summary = detail?.name ?? detail?.merchant ?? "";

  // Build the approval-requested content (mimics CreateTransactionConfirmation)
  const isIncome =
    updates.transaction_type === "income" ||
    (!updates.transaction_type && detail?.transaction_type === "income");
  const isExpense =
    updates.transaction_type === "expense" ||
    (!updates.transaction_type && detail?.transaction_type === "expense");

  // Effective values: use the update value if present, otherwise the
  // current transaction value.
  const effectiveType =
    updates.transaction_type ?? detail?.transaction_type ?? null;
  const effectiveCurrency = updates.currency ?? detail?.currency ?? "USD";
  const effectiveAmount = updates.amount ?? detail?.amount ?? null;

  const currency = effectiveCurrency;
  const amountDisplay =
    effectiveAmount != null ? effectiveAmount.toLocaleString() : "—";
  const amountValue = `${isIncome ? "+" : isExpense ? "-" : ""}${currency} ${amountDisplay}`;

  const approvalContent = loading ? (
    <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-secondary)]">
      <Loader2 className="size-4 animate-spin" />
      {t("assistant.deleteTransaction.loadingDetails")}
    </div>
  ) : !detail ? (
    <p className="py-4 text-sm text-[var(--text-secondary)]">
      {t("assistant.updateTransaction.notFound")}
    </p>
  ) : (
    <>
      <div className="mb-4 flex justify-center">
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

      <div className="mb-5 text-center">
        <p className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          {amountValue}
        </p>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        {(
          [
            "amount",
            "merchant",
            "category",
            "transaction_date",
          ] as (keyof UpdateFields)[]
        ).map(field => {
          const currentValue = (detail as unknown as Record<string, unknown>)[
            field === "transaction_date" ? "transaction_date" : field
          ] as string | number | null;
          const newValue = updates[field] as string | number | null | undefined;
          const isChanged = changedFields.includes(field);

          const currentDisplay = formatValue(
            field,
            currentValue,
            t as (key: string, options?: Record<string, unknown>) => string
          );
          const newDisplay = formatValue(
            field,
            newValue,
            t as (key: string, options?: Record<string, unknown>) => string
          );

          return (
            <div key={field} className="min-w-0">
              <dt className="text-xs font-medium text-[var(--text-secondary)]">
                {t(FIELD_LABELS[field] ?? field)}
              </dt>
              {isChanged ? (
                <dd className="truncate">
                  <span className="font-medium text-[var(--text-secondary)] line-through">
                    {currentDisplay}
                  </span>{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {newDisplay}
                  </span>
                </dd>
              ) : (
                <dd className="truncate font-medium text-[var(--text-primary)]">
                  {currentDisplay}
                </dd>
              )}
            </div>
          );
        })}

        {(changedFields.includes("name") || detail.name) && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t(FIELD_LABELS.name ?? "name")}
            </dt>
            {changedFields.includes("name") ? (
              <dd>
                {detail.name && (
                  <span className="font-medium text-[var(--text-secondary)] line-through">
                    {detail.name}
                  </span>
                )}{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {updates.name}
                </span>
              </dd>
            ) : (
              <dd className="font-medium text-[var(--text-primary)]">
                {detail.name}
              </dd>
            )}
          </div>
        )}

        {(changedFields.includes("transaction_description") ||
          detail.transaction_description) && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t(FIELD_LABELS.transaction_description ?? "description")}
            </dt>
            {changedFields.includes("transaction_description") ? (
              <dd>
                {detail.transaction_description && (
                  <span className="font-medium text-[var(--text-secondary)] line-through">
                    {detail.transaction_description}
                  </span>
                )}{" "}
                <span className="font-semibold text-[var(--text-primary)]">
                  {updates.transaction_description}
                </span>
              </dd>
            ) : (
              <dd className="font-medium text-[var(--text-primary)]">
                {detail.transaction_description}
              </dd>
            )}
          </div>
        )}

        {tagsChanged && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("tags.title", "Tags")}
            </dt>
            <dd className="space-y-2">
              {removedTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[var(--text-secondary)]">
                    −
                  </span>
                  {removedTags.map(tag => (
                    <TagBadge
                      key={`r-${tag.id}`}
                      name={tag.name}
                      color={tag.color}
                      size="sm"
                      className="opacity-60"
                    />
                  ))}
                </div>
              )}
              {addedTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[var(--text-secondary)]">
                    +
                  </span>
                  {addedTags.map(tag => (
                    <TagBadge
                      key={`a-${tag.id}`}
                      name={tag.name}
                      color={tag.color}
                      size="sm"
                    />
                  ))}
                </div>
              )}
              {addedTags.length === 0 && removedTags.length === 0 && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {t("assistant.updateTransaction.tagsUnchanged")}
                </p>
              )}
            </dd>
          </div>
        )}

        {!tagsChanged && currentTagIds.length > 0 && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t("tags.title", "Tags")}
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {finalTags.map(tag => (
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
    </>
  );

  return (
    <ToolApprovalCard
      part={part}
      onApprove={onApprove}
      onReject={onReject}
      i18nPrefix="assistant.updateTransaction"
      count={1}
      summary={summary}
    >
      {approvalContent}
    </ToolApprovalCard>
  );
}
