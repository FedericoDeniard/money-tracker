import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Circle,
  Tag,
  X,
  Wallet,
  Mail,
  ArrowUpDown,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  LayoutList,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";

interface AnimateChangeInHeightProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimateChangeInHeight: React.FC<AnimateChangeInHeightProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(entries => {
        const observedHeight = entries[0]?.contentRect.height ?? 0;
        setHeight(observedHeight);
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <motion.div
      className={cn(className, "overflow-hidden")}
      style={{ height }}
      animate={{ height }}
      transition={{ duration: 0.1, damping: 20, ease: "easeIn" }}
    >
      <div ref={containerRef}>{children}</div>
    </motion.div>
  );
};

export enum FilterType {
  TYPE = "Type",
  CATEGORY = "Category",
  SERVICE_NAME = "Service Name",
  CURRENCY = "Currency",
  EMAIL = "Email",
  START_DATE = "Start date",
  END_DATE = "End date",
  SORT_BY = "Sort By",
}

export enum FilterOperator {
  IS = "is",
  IS_NOT = "is not",
  INCLUDE = "include",
  AFTER = "after",
  BEFORE = "before",
}

export type FilterOption = {
  name: string;
  icon?: React.ReactNode;
  label?: string;
};

export type Filter = {
  id: string;
  type: FilterType;
  operator: FilterOperator;
  value: string[];
};

// Converts operator enum value to its i18n key (e.g. "is not" → "isNot")
const toFilterKey = (operator: string) =>
  operator.replace(/ (\w)/g, (_, c: string) => c.toUpperCase());

export const getFilterTypeName = (
  type: FilterType,
  t: (key: string) => string
): string => {
  switch (type) {
    case FilterType.TYPE:
      return t("transactions.type");
    case FilterType.CATEGORY:
      return t("transactions.category");
    case FilterType.SERVICE_NAME:
      return t("transactions.serviceName");
    case FilterType.CURRENCY:
      return t("transactions.currency");
    case FilterType.EMAIL:
      return t("transactions.email");
    case FilterType.START_DATE:
      return t("transactions.startDate");
    case FilterType.END_DATE:
      return t("transactions.endDate");
    case FilterType.SORT_BY:
      return t("transactions.sortBy");
    default:
      return type;
  }
};

export const FilterIcon = ({
  type,
  className,
}: {
  type: FilterType | string;
  className?: string;
}) => {
  const iconClass = cn("size-3.5", className);
  switch (type) {
    case FilterType.TYPE:
      return <LayoutList className={iconClass} />;
    case FilterType.CATEGORY:
      return <Tag className={iconClass} />;
    case FilterType.SERVICE_NAME:
      return <Search className={iconClass} />;
    case FilterType.CURRENCY:
      return <Wallet className={iconClass} />;
    case FilterType.EMAIL:
      return <Mail className={iconClass} />;
    case FilterType.START_DATE:
    case FilterType.END_DATE:
      return <Calendar className={iconClass} />;
    case FilterType.SORT_BY:
      return <ArrowUpDown className={iconClass} />;
    case "income":
      return <ArrowDownCircle className={iconClass} />;
    case "expense":
      return <ArrowUpCircle className={iconClass} />;
    case "all":
      return <LayoutList className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
};

const filterOperators = ({
  filterType,
  filterValues: _filterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
}) => {
  switch (filterType) {
    case FilterType.TYPE:
    case FilterType.CATEGORY:
    case FilterType.CURRENCY:
    case FilterType.EMAIL:
      return [FilterOperator.IS, FilterOperator.IS_NOT];
    case FilterType.SORT_BY:
      return [FilterOperator.IS];
    case FilterType.SERVICE_NAME:
      return [FilterOperator.INCLUDE];
    case FilterType.START_DATE:
      return [FilterOperator.AFTER];
    case FilterType.END_DATE:
      return [FilterOperator.BEFORE];
    default:
      return [];
  }
};

const FilterOperatorDropdown = ({
  filterType,
  operator,
  filterValues,
  setOperator,
}: {
  filterType: FilterType;
  operator: FilterOperator;
  filterValues: string[];
  setOperator: (operator: FilterOperator) => void;
}) => {
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
};

const FilterValueCombobox = ({
  filterType,
  options,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  options: FilterOption[];
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const commandInputRef = useRef<HTMLInputElement>(null);
  const nonSelectedFilterValues = options.filter(
    filter => !filterValues.includes(filter.name)
  );

  return (
    <Popover
      open={open}
      onOpenChange={open => {
        setOpen(open);
        if (!open) {
          setTimeout(() => {
            setCommandInput("");
          }, 200);
        }
      }}
    >
      <PopoverTrigger className="border-l border-[var(--text-secondary)]/20 px-2 h-full bg-[var(--bg-secondary)] hover:bg-[var(--text-secondary)]/10 transition text-[var(--text-primary)] shrink-0 min-w-[50px] text-left flex items-center">
        <div className="flex gap-1.5 items-center">
          <div className="flex items-center flex-row -space-x-1.5">
            <AnimatePresence mode="popLayout">
              {filterValues?.slice(0, 3).map(value => (
                <motion.div
                  key={value}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <FilterIcon
                    type={value as string}
                    className="bg-[var(--bg-secondary)] rounded-full"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {filterValues?.length === 1
            ? options.find(o => o.name === filterValues[0])?.label ||
              filterValues[0]
            : filterValues?.length > 1
              ? t("filters.nSelected", { count: filterValues.length })
              : t("filters.select")}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <AnimateChangeInHeight>
          <Command>
            <CommandInput
              placeholder={getFilterTypeName(filterType, t)}
              className="h-9"
              value={commandInput}
              onInputCapture={e => {
                setCommandInput(e.currentTarget.value);
              }}
              ref={commandInputRef}
            />
            <CommandList>
              <CommandEmpty>{t("errors.noData", "Sin datos")}</CommandEmpty>
              <CommandGroup>
                {filterValues.map(value => (
                  <CommandItem
                    key={value}
                    className="group flex gap-2 items-center"
                    onSelect={() => {
                      setFilterValues(filterValues.filter(v => v !== value));
                      setTimeout(() => {
                        setCommandInput("");
                      }, 200);
                      setOpen(false);
                    }}
                  >
                    <Checkbox checked={true} />
                    {options.find(o => o.name === value)?.icon || (
                      <FilterIcon type={value} />
                    )}
                    {options.find(o => o.name === value)?.label || value}
                  </CommandItem>
                ))}
              </CommandGroup>
              {nonSelectedFilterValues?.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    {nonSelectedFilterValues.map((filter: FilterOption) => (
                      <CommandItem
                        className="group flex gap-2 items-center"
                        key={filter.name}
                        value={filter.name}
                        onSelect={(currentValue: string) => {
                          setFilterValues([currentValue]); // single select for most of ours
                          setTimeout(() => {
                            setCommandInput("");
                          }, 200);
                          setOpen(false);
                        }}
                      >
                        <Checkbox
                          checked={false}
                          className="opacity-0 group-data-[selected=true]:opacity-100"
                        />
                        {filter.icon || <FilterIcon type={filter.name} />}
                        <span className="text-[var(--text-primary)]">
                          {filter.label || filter.name}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </AnimateChangeInHeight>
      </PopoverContent>
    </Popover>
  );
};

const FilterValueInput = ({
  filterType: _filterType,
  filterValues,
  setFilterValues,
}: {
  filterType: FilterType;
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const { t } = useTranslation();
  return (
    <input
      type="text"
      className="border-l border-[var(--text-secondary)]/20 bg-[var(--bg-secondary)] px-2 h-full outline-none min-w-[100px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
      placeholder={`${t("transactions.merchant", "Valor")}...`}
      value={filterValues[0] || ""}
      onChange={e => setFilterValues([e.target.value])}
    />
  );
};

const FilterValueDateInput = ({
  filterValues,
  setFilterValues,
}: {
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center bg-[var(--bg-secondary)] px-2 h-full relative border-l border-[var(--text-secondary)]/20">
      <input
        ref={inputRef}
        type="date"
        className="bg-transparent outline-none text-[var(--text-primary)] min-w-[125px] sm:min-w-[135px] cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
        value={filterValues[0] || ""}
        onChange={e => setFilterValues([e.target.value])}
        onClick={_e => {
          if (typeof inputRef.current?.showPicker === "function") {
            try {
              inputRef.current.showPicker();
            } catch {
              // Ignore if already shown or not supported
            }
          }
        }}
      />
    </div>
  );
};

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
