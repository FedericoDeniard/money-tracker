import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { TagBadge } from "../tags/TagBadge";
import type { Tag } from "../../types/tags";

export interface UpdateFieldValue {
  category?: string;
  name?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  transaction_description?: string;
  transaction_type?: "income" | "expense";
  transaction_date?: string;
  tag_ids?: string[];
}

export interface TransactionDetailShape {
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

const FIELD_LABELS: Partial<Record<keyof UpdateFieldValue, string>> = {
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
  field: keyof UpdateFieldValue,
  value: string | number | null | undefined,
  t: TFunction
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

interface UpdateTransactionApprovalBodyProps {
  updates: UpdateFieldValue;
  detail: TransactionDetailShape;
  changedFields: (keyof UpdateFieldValue)[];
  isIncome: boolean;
  isExpense: boolean;
  amountValue: string;
  tagsChanged: boolean;
  currentTagIds: string[];
  addedTags: Tag[];
  removedTags: Tag[];
  finalTags: Tag[];
}

function UpdateTransactionApprovalBody({
  updates,
  detail,
  changedFields,
  isIncome,
  isExpense,
  amountValue,
  tagsChanged,
  currentTagIds,
  addedTags,
  removedTags,
  finalTags,
}: UpdateTransactionApprovalBodyProps) {
  const { t } = useTranslation();

  const isChanged = (field: keyof UpdateFieldValue) =>
    changedFields.includes(field);

  const currentValue = (field: keyof UpdateFieldValue) =>
    (detail as unknown as Record<string, unknown>)[field as string] as
      | string
      | number
      | null;

  return (
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
          ] as (keyof UpdateFieldValue)[]
        ).map(field => {
          const newValue = updates[field] as string | number | null | undefined;
          return (
            <div key={field} className="min-w-0">
              <dt className="text-xs font-medium text-[var(--text-secondary)]">
                {t(FIELD_LABELS[field] ?? field)}
              </dt>
              {isChanged(field) ? (
                <dd className="truncate">
                  <span className="font-medium text-[var(--text-secondary)] line-through">
                    {formatValue(field, currentValue(field), t)}
                  </span>{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {formatValue(field, newValue, t)}
                  </span>
                </dd>
              ) : (
                <dd className="truncate font-medium text-[var(--text-primary)]">
                  {formatValue(field, currentValue(field), t)}
                </dd>
              )}
            </div>
          );
        })}

        {(isChanged("name") || detail.name) && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t(FIELD_LABELS.name ?? "name")}
            </dt>
            {isChanged("name") ? (
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

        {(isChanged("transaction_description") ||
          detail.transaction_description) && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs font-medium text-[var(--text-secondary)]">
              {t(FIELD_LABELS.transaction_description ?? "description")}
            </dt>
            {isChanged("transaction_description") ? (
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
}

interface UpdateTransactionApprovalContentProps extends Omit<
  UpdateTransactionApprovalBodyProps,
  "amountValue"
> {
  loading: boolean;
  amountValue: string;
}

export function UpdateTransactionApprovalContent(
  props: UpdateTransactionApprovalContentProps
) {
  const { loading, detail, ...rest } = props;
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--text-secondary)]">
        <Loader2 className="size-4 animate-spin" />
        {t("assistant.deleteTransaction.loadingDetails")}
      </div>
    );
  }

  if (!detail) {
    return (
      <p className="py-4 text-sm text-[var(--text-secondary)]">
        {t("assistant.updateTransaction.notFound")}
      </p>
    );
  }

  return <UpdateTransactionApprovalBody detail={detail} {...rest} />;
}
