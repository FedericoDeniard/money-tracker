import { TagSelector } from "../tags/TagSelector";
import type { Tag } from "../../types/tags";

interface TransactionDetailTagsProps {
  label: string;
  selectedIds: string[];
  allTags: Tag[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}

export function TransactionDetailTags({
  label,
  selectedIds,
  allTags,
  disabled,
  onChange,
}: TransactionDetailTagsProps) {
  // `allTags` is forwarded for downstream consumers (kept in the contract so
  // a future "create new tag" flow inside the detail view can resolve names
  // without an extra fetch). Not read by TagSelector itself.
  void allTags;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--text-secondary)] text-sm font-medium">
        {label}
      </span>
      <TagSelector
        mode="assign"
        value={selectedIds}
        onChange={onChange}
        disabled={disabled}
        iconOnly
      />
    </div>
  );
}
