import { useTranslation } from "react-i18next";
import { type FilterType } from "./filters-types";

export function FilterValueInput({
  filterType: _filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) {
  const { t } = useTranslation();
  return (
    <input
      type="text"
      aria-label={t("transactions.merchant", "Valor")}
      className="border-l border-[var(--text-secondary)]/20 bg-[var(--bg-secondary)] px-2 h-full outline-none min-w-[100px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
      placeholder={`${t("transactions.merchant", "Valor")}...`}
      value={filterValues[0] || ""}
      onChange={e => setFilterValues([e.target.value])}
    />
  );
}
