import {
  Check,
  Copy,
  ArrowUp,
  ArrowDown,
  Download,
  AlertCircle,
} from "lucide-react";
import type { Transaction } from "../../services/emails.service";
import { getTransactionType } from "../../utils/transactionUtils";
import { useState } from "react";

interface TransactionDetailProps {
  transaction: Transaction;
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const { isIncome } = getTransactionType(transaction.transaction_type);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (typeof window !== "undefined" && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(transaction.source_message_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const amountColor = "text-[var(--text-primary)]";

  // Format date and time
  const dateObj = new Date(transaction.transaction_date || transaction.date);
  const dateTimeStr = dateObj.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="h-full flex flex-col bg-white rounded-3xl p-6 relative shadow-sm border border-gray-100">
      {/* Header with Icon */}
      <div className="flex justify-center mb-6 mt-2">
        <div
          className={`p-4 rounded-2xl ${
            isIncome ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {isIncome ? (
            <ArrowDown strokeWidth={3} size={32} />
          ) : (
            <ArrowUp strokeWidth={3} size={32} />
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-center mb-3">
        <h1 className={`text-3xl font-bold ${amountColor} tracking-tight`}>
          {isIncome ? "+" : "-"}
          {transaction.currency} {transaction.amount.toLocaleString()}
        </h1>
      </div>

      {/* Context Pill */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm text-[var(--text-secondary)] shadow-sm">
          <div
            className={`w-2 h-2 rounded-full ${isIncome ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="font-medium text-[var(--text-primary)]">
            {transaction.merchant || "Desconocido"}
          </span>
          <span className="text-gray-300 text-xs">•</span>
          <span className="capitalize">{transaction.category}</span>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-6 px-1">
        <DetailRow label="Fecha y Hora" value={dateTimeStr} />

        <DetailRow
          label="Tipo de transacción"
          value={isIncome ? "Ingreso" : "Gasto"}
        />

        <DetailRow
          label={isIncome ? "Recibido de" : "Comercio"}
          value={transaction.merchant || "Desconocido"}
        />

        <DetailRow
          label="Monto"
          value={`${transaction.currency} ${transaction.amount.toLocaleString()}`}
        />

        <div className="flex items-center justify-between py-1">
          <span className="text-[var(--text-secondary)] text-sm">
            Referencia
          </span>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium text-sm text-right overflow-hidden pl-4">
            <span className="truncate w-32 md:w-40 font-mono text-xs opacity-70">
              {transaction.source_message_id}
            </span>
            <button
              onClick={handleCopyId}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 hover:bg-gray-100 rounded"
              title="Copiar ID"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto pt-8">
        <div className="flex gap-3">
          <button className="flex-1 py-3.5 px-4 rounded-2xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            Reportar
          </button>
          <button className="flex-1 py-3.5 px-4 rounded-2xl bg-gray-50 text-[var(--text-primary)] font-medium text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
            <Download size={16} />
            Recibo
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[var(--text-secondary)] text-sm">{label}</span>
      <span className="text-[var(--text-primary)] font-medium text-sm text-right">
        {value}
      </span>
    </div>
  );
}
