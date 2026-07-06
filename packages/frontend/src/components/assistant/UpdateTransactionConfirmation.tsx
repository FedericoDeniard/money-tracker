import { useEffect, useMemo, useState } from "react";
import type { ToolUIPart } from "ai";
import { getSupabase } from "../../lib/supabase";
import { ToolApprovalCard } from "./ToolApprovalCard";
import { useTags } from "../../hooks/useTags";
import type { Tag } from "../../types/tags";
import {
  UpdateTransactionApprovalContent,
  type UpdateFieldValue,
  type TransactionDetailShape,
} from "./UpdateTransactionApprovalBody";

type UpdateFields = UpdateFieldValue;

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

export function UpdateTransactionConfirmation({
  part,
  onApprove,
  onReject,
}: UpdateTransactionConfirmationProps) {
  const [detail, setDetail] = useState<TransactionDetailShape | null>(null);
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
        setDetail(detailRes.data as unknown as TransactionDetailShape);
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

  const isIncome =
    updates.transaction_type === "income" ||
    (!updates.transaction_type && detail?.transaction_type === "income");
  const isExpense =
    updates.transaction_type === "expense" ||
    (!updates.transaction_type && detail?.transaction_type === "expense");

  const effectiveCurrency = updates.currency ?? detail?.currency ?? "USD";
  const effectiveAmount = updates.amount ?? detail?.amount ?? null;
  const amountDisplay =
    effectiveAmount != null ? effectiveAmount.toLocaleString() : "—";
  const amountValue = `${isIncome ? "+" : isExpense ? "-" : ""}${effectiveCurrency} ${amountDisplay}`;

  return (
    <ToolApprovalCard
      part={part}
      onApprove={onApprove}
      onReject={onReject}
      i18nPrefix="assistant.updateTransaction"
      count={1}
      summary={summary}
    >
      <UpdateTransactionApprovalContent
        loading={loading}
        detail={detail}
        updates={updates}
        changedFields={changedFields}
        isIncome={isIncome}
        isExpense={isExpense}
        amountValue={amountValue}
        tagsChanged={tagsChanged}
        currentTagIds={currentTagIds}
        addedTags={addedTags}
        removedTags={removedTags}
        finalTags={finalTags}
      />
    </ToolApprovalCard>
  );
}
