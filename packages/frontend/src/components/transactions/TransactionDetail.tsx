import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  Receipt,
} from "lucide-react";
import type { Transaction } from "../../services/emails.service";
import { getTransactionType, formatDate } from "../../utils/transactionUtils";

interface TransactionDetailProps {
  transaction: Transaction;
}

export function TransactionDetail({ transaction }: TransactionDetailProps) {
  const { isExpense, isIncome } = getTransactionType(
    transaction.transaction_type,
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-[var(--text-secondary)]/20">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {transaction.transaction_description}
        </h3>
        <div className="text-sm text-[var(--text-secondary)] space-y-1">
          <p>Fecha: {formatDate(transaction.transaction_date)}</p>
          <p>Email de origen: {transaction.source_email}</p>
          <p>ID del mensaje: {transaction.source_message_id}</p>
        </div>

        {/* Transaction Information */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <DollarSign size={18} />
            Detalles de la Transacción
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">Monto:</span>
              <span
                className={`font-semibold text-lg ${
                  isExpense
                    ? "text-[var(--error)]"
                    : isIncome
                      ? "text-[var(--success)]"
                      : "text-gray-900"
                }`}
              >
                {transaction.currency} ${transaction.amount}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Fecha:</span>
              <p className="font-medium flex items-center gap-1">
                <Calendar size={16} />
                {transaction.transaction_date ||
                  new Date(transaction.date).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
              </p>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Tipo:</span>
              <p className="font-medium flex items-center gap-1">
                {isExpense ? (
                  <>
                    <TrendingDown size={16} className="text-[var(--error)]" />
                    <span className="text-red-700 font-semibold">GASTO</span>
                  </>
                ) : isIncome ? (
                  <>
                    <TrendingUp size={16} className="text-[var(--success)]" />
                    <span className="text-green-700 font-semibold">
                      INGRESO
                    </span>
                  </>
                ) : (
                  <>
                    <Receipt size={16} className="text-gray-500" />
                  </>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--text-secondary)]">Comercio:</span>
              <p className="font-medium flex items-center gap-1">
                <Store size={16} />
                {transaction.merchant}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-[var(--text-secondary)]">Categoría:</span>
              <p className="font-medium flex items-center gap-1">
                <Receipt size={16} />
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                  {transaction.category}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
