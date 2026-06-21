import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  type FilterType,
  type FilterOperator,
  filterOperators,
  toFilterKey,
} from "./filters-types";

export function FilterOperatorDropdown({
  filterType,
  operator,
  filterValues,
  setOperator,
}: {
  filterType: FilterType;
  operator: FilterOperator;
  filterValues: string[];
  setOperator: (operator: FilterOperator) => void;
}) {
  const { t } = useTranslation();
  const operators = filterOperators({ filterType, filterValues });

  const segmentClass =
    "border-l border-[var(--text-secondary)]/20 h-full flex items-center px-1.5 shrink-0 text-[var(--text-secondary)]";

  if (operators.length <= 1) {
    return (
      <div className={segmentClass}>
        {t(`filters.${toFilterKey(operator || operators[0])}`)}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          segmentClass,
          "hover:bg-[var(--text-secondary)]/10 hover:text-[var(--text-primary)] transition cursor-pointer"
        )}
      >
        {t(`filters.${toFilterKey(operator)}`)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map(op => (
          <DropdownMenuItem key={op} onClick={() => setOperator(op)}>
            {t(`filters.${toFilterKey(op)}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
