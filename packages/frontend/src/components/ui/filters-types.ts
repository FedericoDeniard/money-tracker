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

export const toFilterKey = (operator: string) =>
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

export const filterOperators = ({
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
