export type ExpectedTransactionType = "income" | "expense";

export interface TransactionAgentManualLabel {
  name: string;
  expectedHasTransaction: boolean;
  rationale: string;
  /** Monto que el correo confirma como movimiento ya realizado (solo si expectedHasTransaction). */
  expectedAmount?: number;
  /** ISO 4217, alineado con TransactionSchema. */
  expectedCurrency?: string;
  expectedType?: ExpectedTransactionType;
}

// Manual ground truth labels for Langfuse dataset items.
// Keyed by `datasetItemId`.
export const transactionAgentManualLabels: Record<
  string,
  TransactionAgentManualLabel
> = {
  // Correo: "Ya enviamos tu transferencia de $ 5.500" — monto explícito del envío ya ejecutado; ARS por contexto Mercado Pago.
  "1d9674e8-6205-4f99-aa6e-2a803af50cfe": {
    name: "mercado pago transfer already sent should be true",
    expectedHasTransaction: true,
    expectedAmount: 5500,
    expectedCurrency: "ARS",
    expectedType: "expense",
    rationale:
      "El texto indica explicitamente 'Ya enviamos tu transferencia', por lo que confirma movimiento ya realizado.",
  },
  // Menciona $ 437.567,03 como "Monto total a debitar al vencimiento" (10/4/2026) — proyección, no débito concretado.
  "53cb1b61-7a55-45e9-b539-7643c885e109": {
    name: "mortgage upcoming payment notice should be false",
    expectedHasTransaction: false,
    rationale:
      "Describe proximo pago y monto a debitar al vencimiento; no confirma debito ejecutado.",
  },
  // Primas/cuotas planificadas (ej. total en cuotas); no constancia de un pago ya efectuado en la fecha del mail.
  "66e6fda6-5521-402a-8e19-b13bf5eaf652": {
    name: "insurance policy and installment schedule should be false",
    expectedHasTransaction: false,
    rationale:
      "Es emision/renovacion de poliza con cronograma de cuotas y vencimientos; no evidencia pago concretado.",
  },
  // Puede citar precio de entradas; es confirmación de compra de tickets, fuera del alcance de transacción bancaria confirmada.
  "ff8c19b6-9ce1-4751-9078-d6dad785f86c": {
    name: "passline ticket confirmation should be false",
    expectedHasTransaction: false,
    rationale:
      "Es una confirmacion de eTickets/evento y no se considera movimiento financiero confirmado en el contexto deseado.",
  },
  "41355d32-2751-40b9-9f67-5d80481e6c81": {
    name: "duplicate mortgage upcoming payment notice should be false",
    expectedHasTransaction: false,
    rationale:
      "Es el mismo patron de aviso de vencimiento futuro, sin confirmacion de movimiento ya realizado.",
  },
};
