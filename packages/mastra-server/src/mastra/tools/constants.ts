export const CATEGORY_VALUES = [
  "salary",
  "entertainment",
  "investment",
  "food",
  "transport",
  "services",
  "health",
  "education",
  "housing",
  "clothing",
  "taxes",
  "other",
] as const;

export const TRANSACTION_TYPE_VALUES = ["income", "expense"] as const;

export type CategoryValue = (typeof CATEGORY_VALUES)[number];
export type TransactionTypeValue = (typeof TRANSACTION_TYPE_VALUES)[number];
