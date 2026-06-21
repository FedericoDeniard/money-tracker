import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { type Filter, type FilterOption, FilterType } from "./filters-types";
import { FilterIcon } from "./FilterIcon";
import { FilterOperatorDropdown } from "./FilterOperatorDropdown";
import { FilterValueCombobox } from "./FilterValueCombobox";
import { FilterValueInput } from "./FilterValueInput";
import { FilterValueDateInput } from "./FilterValueDateInput";

export default function Filters({
  filters,
  setFilters,
  getOptionsForType,
}: {
  filters: Filter[];
  setFilters: Dispatch<SetStateAction<Filter[]>>;
  getOptionsForType: (type: FilterType) => FilterOption[];
}) {
  const { t } = useTranslation();

  const getTranslatedFilterName = (type: FilterType) => {
    switch (type) {
      case FilterType.TYPE:
        return t("transactions.type");
      case FilterType.CATEGORY:
        return t("transactions.category");
      case FilterType.SERVICE_NAME:
        return t("transactions.merchant");
      case FilterType.CURRENCY:
        return t("transactions.currency", "Moneda");
      case FilterType.EMAIL:
        return t("transactions.email", "Email");
      case FilterType.START_DATE:
        return t("transactions.startDate");
      case FilterType.END_DATE:
        return t("transactions.endDate");
      case FilterType.SORT_BY:
        return t("transactions.sortBy", "Ordenar por");
      default:
        return type;
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(filter => (
        <div
          key={filter.id}
          className="flex items-center text-xs h-8 rounded-lg overflow-hidden border border-[var(--button-primary)]/25 bg-[var(--bg-secondary)]"
        >
          <div className="flex gap-1.5 shrink-0 bg-[var(--button-primary)] text-white px-2 items-center h-full font-medium">
            <FilterIcon type={filter.type} />
            {getTranslatedFilterName(filter.type)}
          </div>
          <FilterOperatorDropdown
            filterType={filter.type}
            operator={filter.operator}
            filterValues={filter.value}
            setOperator={operator => {
              setFilters(prev =>
                prev.map(f => (f.id === filter.id ? { ...f, operator } : f))
              );
            }}
          />
          {filter.type === FilterType.START_DATE ||
          filter.type === FilterType.END_DATE ? (
            <FilterValueDateInput
              filterValues={filter.value}
              setFilterValues={filterValues => {
                setFilters(prev =>
                  prev.map(f =>
                    f.id === filter.id ? { ...f, value: filterValues } : f
                  )
                );
              }}
            />
          ) : filter.type === FilterType.SERVICE_NAME ? (
            <FilterValueInput
              filterType={filter.type}
              filterValues={filter.value}
              setFilterValues={filterValues => {
                setFilters(prev =>
                  prev.map(f =>
                    f.id === filter.id ? { ...f, value: filterValues } : f
                  )
                );
              }}
            />
          ) : (
            <FilterValueCombobox
              filterType={filter.type}
              options={getOptionsForType(filter.type)}
              filterValues={filter.value}
              setFilterValues={filterValues => {
                setFilters(prev =>
                  prev.map(f =>
                    f.id === filter.id ? { ...f, value: filterValues } : f
                  )
                );
              }}
            />
          )}
          <button
            type="button"
            aria-label={t("filters.remove")}
            onClick={() =>
              setFilters(prev => prev.filter(f => f.id !== filter.id))
            }
            className="border-l border-[var(--text-secondary)]/20 h-full w-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 transition shrink-0"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
