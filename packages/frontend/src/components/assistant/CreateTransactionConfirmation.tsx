import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ToolUIPart } from "ai";
import { useTags } from "../../hooks/useTags";
import type { Tag } from "../../types/tags";
import { CreateTransactionApprovalCard } from "./CreateTransactionApprovalCard";
import {
  ProcessingStatus,
  DeniedStatus,
  ErrorStatus,
  ApprovedStatus,
} from "./ToolConfirmationStatuses";

type CreateTransactionTxn = {
  transaction_type?: "income" | "expense";
  name?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  transaction_date?: string;
  transaction_description?: string;
  tag_ids?: string[];
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
  tagIds: string[];
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

function summarizeTxns(transactions: CreateTransactionTxn[]): string {
  return transactions
    .flatMap(t => [t.name, t.merchant].filter((v): v is string => !!v))
    .join(", ");
}

export function CreateTransactionConfirmation({
  part,
  onApprove,
  onReject,
}: CreateTransactionConfirmationProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const transactions = part.input?.transactions ?? [];
  const current = transactions[currentIndex] ?? transactions[0];

  const { data: allTags = [] } = useTags();
  const tagsById = useMemo(
    () => new Map(allTags.map(tag => [tag.id, tag])),
    [allTags]
  );
  const currentTags = useMemo(() => {
    if (!current) return [];
    const tagIds = current.tag_ids ?? [];
    return tagIds
      .map(id => tagsById.get(id))
      .filter((tag): tag is Tag => !!tag);
  }, [current, tagsById]);

  if (part.state === "input-streaming" || part.state === "input-available") {
    return null;
  }

  if (!transactions || transactions.length === 0) {
    return null;
  }

  const isDenied =
    part.state === "output-denied" ||
    (part.state === "output-available" && isExecutionDeniedOutput(part.output));
  const total = transactions.length;
  const showCarousel = total > 1;
  const summary = summarizeTxns(transactions);

  if (part.state === "approval-requested" && current) {
    const approvalId = part.approval.id;
    return (
      <CreateTransactionApprovalCard
        current={current}
        total={total}
        showCarousel={showCarousel}
        currentIndex={currentIndex}
        resolvedTags={currentTags}
        approvalId={approvalId}
        onPrev={() => setCurrentIndex(i => Math.max(0, i - 1))}
        onNext={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
        onApprove={onApprove}
        onReject={onReject}
      />
    );
  }

  if (part.state === "approval-responded") {
    const wasApproved = part.approval.approved !== false;
    return <ProcessingStatus approved={wasApproved} count={total} t={t} />;
  }

  if (isDenied) {
    return <DeniedStatus count={total} summary={summary} t={t} />;
  }

  if (part.state === "output-error") {
    return <ErrorStatus errorText={part.errorText} t={t} />;
  }

  return <ApprovedStatus count={total} summary={summary} />;
}
