import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import { ArrowDownUp, ArrowUpDown, Check, ListFilter, X } from "lucide-react";
import { nanoid } from "nanoid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";

import Filters, {
  AnimateChangeInHeight,
  FilterOperator,
  FilterType,
  FilterIcon,
  getFilterTypeName,
} from "../ui/filters";
import type { Filter, FilterOption } from "../ui/filters";

import type { TransactionFilters } from "../../services/transactions.service";
import { useTransactionFilters } from "../../hooks/useTransactionFilters";

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  categories: string[];
  isLoading?: boolean;
}

export function TransactionFiltersComponent({
  filters,
  onFiltersChange,
  categories,
  isLoading = false,
}: TransactionFiltersProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [selectedView, setSelectedView] = React.useState<FilterType | null>(
    null
  );
  const [commandInput, setCommandInput] = React.useState("");
  const commandInputRef = React.useRef<HTMLInputElement>(null);

  // Dynamic filter lists from hooks
  const { currencies: availableCurrencies, emails: availableEmails } =
    useTransactionFilters();

  // Mapping domain-specific data to generic Filters Array format
  const filtersArray = useMemo(() => {
    const arr: Filter[] = [];
    if (filters.type && filters.type !== "all") {
      arr.push({
        id: "type",
        type: FilterType.TYPE,
        operator:
          filters.typeOperator === "is not"
            ? FilterOperator.IS_NOT
            : FilterOperator.IS,
        value: [filters.type],
      });
    }
    if (filters.category) {
      arr.push({
        id: "category",
        type: FilterType.CATEGORY,
        operator:
          filters.categoryOperator === "is not"
            ? FilterOperator.IS_NOT
            : FilterOperator.IS,
        value: [filters.category],
      });
    }
    if (filters.serviceName !== undefined) {
      arr.push({
        id: "serviceName",
        type: FilterType.SERVICE_NAME,
        operator: FilterOperator.INCLUDE,
        value: [filters.serviceName],
      });
    }
    if (filters.currency) {
      arr.push({
        id: "currency",
        type: FilterType.CURRENCY,
        operator:
          filters.currencyOperator === "is not"
            ? FilterOperator.IS_NOT
            : FilterOperator.IS,
        value: [filters.currency],
      });
    }
    if (filters.email) {
      arr.push({
        id: "email",
        type: FilterType.EMAIL,
        operator:
          filters.emailOperator === "is not"
            ? FilterOperator.IS_NOT
            : FilterOperator.IS,
        value: [filters.email],
      });
    }
    if (filters.startDate !== undefined) {
      arr.push({
        id: "startDate",
        type: FilterType.START_DATE,
        operator: FilterOperator.AFTER,
        value: [filters.startDate],
      });
    }
    if (filters.endDate !== undefined) {
      arr.push({
        id: "endDate",
        type: FilterType.END_DATE,
        operator: FilterOperator.BEFORE,
        value: [filters.endDate],
      });
    }
    return arr;
  }, [filters]);

  const updateFiltersArray = (updater: React.SetStateAction<Filter[]>) => {
    const nextArr =
      typeof updater === "function" ? updater(filtersArray) : updater;

    // Map back to TransactionFilters
    const newFilters: TransactionFilters = {};
    for (const item of nextArr) {
      if (!item.value || item.value.length === 0 || item.value[0] === undefined)
        continue;

      switch (item.type) {
        case FilterType.TYPE:
          newFilters.type = item.value[0] as NonNullable<
            TransactionFilters["type"]
          >;
          newFilters.typeOperator =
            item.operator === FilterOperator.IS_NOT ? "is not" : "is";
          break;
        case FilterType.CATEGORY:
          newFilters.category = item.value[0];
          newFilters.categoryOperator =
            item.operator === FilterOperator.IS_NOT ? "is not" : "is";
          break;
        case FilterType.SERVICE_NAME:
          newFilters.serviceName = item.value[0];
          break;
        case FilterType.CURRENCY:
          newFilters.currency = item.value[0];
          newFilters.currencyOperator =
            item.operator === FilterOperator.IS_NOT ? "is not" : "is";
          break;
        case FilterType.EMAIL:
          newFilters.email = item.value[0];
          newFilters.emailOperator =
            item.operator === FilterOperator.IS_NOT ? "is not" : "is";
          break;
        case FilterType.START_DATE:
          newFilters.startDate = item.value[0];
          break;
        case FilterType.END_DATE:
          newFilters.endDate = item.value[0];
          break;
      }
    }
    onFiltersChange(newFilters);
  };

  const getOptionsForType = (type: FilterType): FilterOption[] => {
    switch (type) {
      case FilterType.TYPE:
        return [
          {
            name: "income",
            label: t("transactions.income"),
            icon: <FilterIcon type="income" />,
          },
          {
            name: "expense",
            label: t("transactions.expense"),
            icon: <FilterIcon type="expense" />,
          },
        ];
      case FilterType.CATEGORY:
        return categories.map(c => ({
          name: c,
          label: t(`categories.${c}`),
          icon: <FilterIcon type={FilterType.CATEGORY} />,
        }));
      case FilterType.CURRENCY:
        return availableCurrencies.map(c => ({
          name: c,
          label: c,
          icon: <FilterIcon type={FilterType.CURRENCY} />,
        }));
      case FilterType.EMAIL:
        return availableEmails.map(c => ({
          name: c,
          label: c,
          icon: <FilterIcon type={FilterType.EMAIL} />,
        }));
      default:
        return [];
    }
  };

  const filterViewOptions: FilterOption[][] = [
    [
      {
        name: FilterType.SERVICE_NAME,
        label: t("transactions.serviceNamePlaceholder"),
        icon: <FilterIcon type={FilterType.SERVICE_NAME} />,
      },
      {
        name: FilterType.TYPE,
        label: t("transactions.allTypes"),
        icon: <FilterIcon type={FilterType.TYPE} />,
      },
      {
        name: FilterType.CATEGORY,
        label: t("transactions.category"),
        icon: <FilterIcon type={FilterType.CATEGORY} />,
      },
    ],
    [
      {
        name: FilterType.CURRENCY,
        label: t("transactions.currency"),
        icon: <FilterIcon type={FilterType.CURRENCY} />,
      },
      {
        name: FilterType.EMAIL,
        label: t("transactions.email"),
        icon: <FilterIcon type={FilterType.EMAIL} />,
      },
    ],
    [
      {
        name: FilterType.START_DATE,
        label: t("transactions.startDate"),
        icon: <FilterIcon type={FilterType.START_DATE} />,
      },
      {
        name: FilterType.END_DATE,
        label: t("transactions.endDate"),
        icon: <FilterIcon type={FilterType.END_DATE} />,
      },
    ],
  ];

  return (
    <section
      className={`rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-4 md:p-6 shadow-sm transition-opacity duration-200 ${
        isLoading ? "opacity-60 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="shrink-0 mb-2 xl:mb-0">
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
            {t("navigation.transactions")}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[var(--text-secondary)] line-clamp-2 md:line-clamp-none">
            {t(
              "transactions.pageDescription",
              "View and manage all your income and expenses in one place."
            )}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Filters
            getOptionsForType={getOptionsForType}
            filters={filtersArray}
            setFilters={updateFiltersArray}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs rounded-lg flex gap-1.5 items-center px-3"
              >
                {filters.sortOrder === "asc" ? (
                  <ArrowUpDown className="size-4 shrink-0" />
                ) : (
                  <ArrowDownUp className="size-4 shrink-0" />
                )}
                {filters.sortBy === "transaction_date"
                  ? t("transactions.byDate")
                  : t("transactions.dateAdded")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs font-medium text-[var(--text-secondary)]">
                {t("transactions.dateAdded")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    sortBy: "created_at",
                    sortOrder: "desc",
                  })
                }
              >
                <Check
                  className={`size-3 mr-1 ${(!filters.sortBy || filters.sortBy === "created_at") && (!filters.sortOrder || filters.sortOrder === "desc") ? "opacity-100" : "opacity-0"}`}
                />
                {t("transactions.newest")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    sortBy: "created_at",
                    sortOrder: "asc",
                  })
                }
              >
                <Check
                  className={`size-3 mr-1 ${(!filters.sortBy || filters.sortBy === "created_at") && filters.sortOrder === "asc" ? "opacity-100" : "opacity-0"}`}
                />
                {t("transactions.oldest")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-[var(--text-secondary)]">
                {t("transactions.byDate")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    sortBy: "transaction_date",
                    sortOrder: "desc",
                  })
                }
              >
                <Check
                  className={`size-3 mr-1 ${filters.sortBy === "transaction_date" && (!filters.sortOrder || filters.sortOrder === "desc") ? "opacity-100" : "opacity-0"}`}
                />
                {t("transactions.newest")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    sortBy: "transaction_date",
                    sortOrder: "asc",
                  })
                }
              >
                <Check
                  className={`size-3 mr-1 ${filters.sortBy === "transaction_date" && filters.sortOrder === "asc" ? "opacity-100" : "opacity-0"}`}
                />
                {t("transactions.oldest")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover
            open={open}
            onOpenChange={open => {
              setOpen(open);
              if (!open) {
                setTimeout(() => {
                  setSelectedView(null);
                  setCommandInput("");
                }, 200);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                selected={filtersArray.length > 0}
                role="combobox"
                aria-expanded={open}
                size="sm"
                className={cn(
                  "h-8 text-xs rounded-lg flex gap-1.5 items-center",
                  filtersArray.length > 0 ? "w-8 px-0 justify-center" : "px-3"
                )}
              >
                <ListFilter className="size-4 shrink-0" />
                {!filtersArray.length && t("transactions.filter", "Filter")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <AnimateChangeInHeight>
                <Command>
                  <CommandInput
                    placeholder={
                      selectedView
                        ? getFilterTypeName(selectedView, t)
                        : t("transactions.filter", "Filter...")
                    }
                    className="h-9"
                    value={commandInput}
                    onInputCapture={e => {
                      setCommandInput(e.currentTarget.value);
                    }}
                    ref={commandInputRef}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {t("errors.noData", "Sin resultados")}
                    </CommandEmpty>
                    {selectedView ? (
                      <CommandGroup>
                        {getOptionsForType(selectedView).map(
                          (filter: FilterOption) => (
                            <CommandItem
                              className="group text-[var(--text-secondary)] flex gap-2 items-center"
                              key={filter.name}
                              value={filter.name}
                              onSelect={currentValue => {
                                updateFiltersArray(prev => [
                                  ...prev,
                                  {
                                    id: nanoid(),
                                    type: selectedView,
                                    operator: FilterOperator.IS,
                                    value: [currentValue],
                                  },
                                ]);
                                setTimeout(() => {
                                  setSelectedView(null);
                                  setCommandInput("");
                                }, 200);
                                setOpen(false);
                              }}
                            >
                              {filter.icon || <FilterIcon type={filter.name} />}
                              <span className="text-[var(--text-primary)]">
                                {filter.label || filter.name}
                              </span>
                            </CommandItem>
                          )
                        )}
                      </CommandGroup>
                    ) : (
                      filterViewOptions.map(
                        (group: FilterOption[], index: number) => (
                          <React.Fragment key={index}>
                            <CommandGroup>
                              {group.map((filter: FilterOption) => (
                                <CommandItem
                                  className="group text-[var(--text-secondary)] flex gap-2 items-center"
                                  key={filter.name}
                                  value={filter.name}
                                  onSelect={currentValue => {
                                    // if it's text input or date, we can just add it and close immediately
                                    const typeEnumsWithoutOptions = [
                                      FilterType.SERVICE_NAME,
                                      FilterType.START_DATE,
                                      FilterType.END_DATE,
                                    ];
                                    if (
                                      typeEnumsWithoutOptions.includes(
                                        currentValue as FilterType
                                      )
                                    ) {
                                      updateFiltersArray(prev => [
                                        ...prev,
                                        {
                                          id: nanoid(),
                                          type: currentValue as FilterType,
                                          operator:
                                            currentValue ===
                                            FilterType.SERVICE_NAME
                                              ? FilterOperator.INCLUDE
                                              : FilterOperator.IS,
                                          value: [""],
                                        },
                                      ]);
                                      setCommandInput("");
                                      setOpen(false);
                                    } else {
                                      setSelectedView(
                                        currentValue as FilterType
                                      );
                                      setCommandInput("");
                                      commandInputRef.current?.focus();
                                    }
                                  }}
                                >
                                  {filter.icon}
                                  <span className="text-[var(--text-primary)]">
                                    {filter.label || filter.name}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                            {index < filterViewOptions.length - 1 && (
                              <CommandSeparator />
                            )}
                          </React.Fragment>
                        )
                      )
                    )}
                  </CommandList>
                </Command>
              </AnimateChangeInHeight>
            </PopoverContent>
          </Popover>

          {filtersArray.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X size={14} />}
              className="text-red-600 hover:bg-red-50 h-8 px-2 text-xs rounded-lg"
              onClick={() =>
                onFiltersChange({
                  sortBy: filters.sortBy,
                  sortOrder: filters.sortOrder,
                })
              }
            >
              {t("transactions.clearFilters", "Clear")}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
