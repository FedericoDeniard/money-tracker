import { useState } from "react";
import {
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  Receipt,
} from "lucide-react";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import {
  createTransactionsService,
  type Transaction,
} from "../services/emails.service";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { EmptyState } from "../components/ui/EmptyState";

export function Transactions() {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const {
    data: transactions,
    loading,
    error,
    refetch,
  } = useSupabaseQuery(async (supabase) => {
    const service = createTransactionsService(supabase);
    return await service.getTransactions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading emails</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Transaction List */}
      <div className="w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--text-secondary)]/20">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt size={20} />
            Transacciones ({transactions?.length || 0})
          </h2>
        </div>
        <div className="overflow-y-auto h-full">
          {transactions && transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No hay transacciones"
              description="Las transacciones extraídas de tus emails aparecerán aquí"
            />
          ) : (
            transactions?.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
                className={`p-4 border-b border-[var(--text-secondary)]/10 cursor-pointer transition-colors hover:bg-[var(--bg-primary)] ${
                  selectedTransaction?.id === transaction.id
                    ? "bg-[var(--bg-primary)]"
                    : ""
                } ${
                  transaction.transaction_type === "egreso" ||
                  transaction.transaction_type === "expense"
                    ? "border-l-4 border-l-red-500"
                    : transaction.transaction_type === "ingreso" ||
                        transaction.transaction_type === "income"
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-gray-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[var(--text-primary)] block truncate">
                      {transaction.transaction_description}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {transaction.transaction_type === "egreso" ||
                      transaction.transaction_type === "expense" ? (
                        <TrendingDown size={14} className="text-red-600" />
                      ) : transaction.transaction_type === "ingreso" ||
                        transaction.transaction_type === "income" ? (
                        <TrendingUp size={14} className="text-green-600" />
                      ) : (
                        <Receipt size={14} className="text-gray-500" />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          transaction.transaction_type === "egreso" ||
                          transaction.transaction_type === "expense"
                            ? "text-red-700 bg-red-50 px-2 py-1 rounded"
                            : transaction.transaction_type === "ingreso" ||
                                transaction.transaction_type === "income"
                              ? "text-green-700 bg-green-50 px-2 py-1 rounded"
                              : "text-gray-600"
                        }`}
                      >
                        {transaction.currency} ${transaction.amount}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        (
                        {transaction.transaction_type === "egreso" ||
                        transaction.transaction_type === "expense"
                          ? "Gasto"
                          : transaction.transaction_type === "ingreso" ||
                              transaction.transaction_type === "income"
                            ? "Ingreso"
                            : transaction.transaction_type}
                        )
                      </span>
                      {transaction.merchant && (
                        <span className="text-xs text-[var(--text-secondary)]">
                          • {transaction.merchant}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-[var(--text-secondary)] space-y-1">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>{formatDate(transaction.transaction_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{transaction.source_email}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaction Detail */}
      <div className="flex-1 bg-[var(--bg-secondary)] rounded-lg overflow-hidden">
        {selectedTransaction ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-[var(--text-secondary)]/20">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                {selectedTransaction.transaction_description}
              </h3>
              <div className="text-sm text-[var(--text-secondary)] space-y-1">
                <p>Fecha: {formatDate(selectedTransaction.transaction_date)}</p>
                <p>Email de origen: {selectedTransaction.source_email}</p>
                <p>ID del mensaje: {selectedTransaction.source_message_id}</p>
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
                        selectedTransaction.transaction_type === "egreso" ||
                        selectedTransaction.transaction_type === "expense"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {selectedTransaction.currency} $
                      {selectedTransaction.amount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Fecha:</span>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar size={16} />
                      {selectedTransaction.transaction_date ||
                        new Date(selectedTransaction.date).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Tipo:</span>
                    <p className="font-medium flex items-center gap-1">
                      {selectedTransaction.transaction_type === "egreso" ||
                      selectedTransaction.transaction_type === "expense" ? (
                        <>
                          <TrendingDown size={16} className="text-red-600" />
                          <span className="text-red-700 font-semibold">
                            GASTO
                          </span>
                        </>
                      ) : selectedTransaction.transaction_type === "ingreso" ||
                        selectedTransaction.transaction_type === "income" ? (
                        <>
                          <TrendingUp size={16} className="text-green-600" />
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
                  {selectedTransaction.merchant && (
                    <div className="col-span-2">
                      <span className="text-[var(--text-secondary)]">
                        Comercio:
                      </span>
                      <p className="font-medium flex items-center gap-1">
                        <Store size={16} />
                        {selectedTransaction.merchant}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
            <div className="text-center">
              <Receipt size={48} className="mx-auto mb-4 opacity-50" />
              <p>Selecciona una transacción para ver sus detalles</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
