import { useState } from "react";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  Receipt,
} from "lucide-react";
import { motion } from "framer-motion";
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
      <div className="w-1/3 bg-[var(--bg-secondary)] rounded-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--text-secondary)]/20">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt size={20} />
            Transacciones ({transactions?.length || 0})
          </h2>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {transactions && transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No hay transacciones"
              description="Las transacciones extraídas de tus emails aparecerán aquí"
            />
          ) : (
            transactions?.map((transaction) => {
              const isExpense =
                transaction.transaction_type === "egreso" ||
                transaction.transaction_type === "expense";
              const isIncome =
                transaction.transaction_type === "ingreso" ||
                transaction.transaction_type === "income";

              return (
                <motion.div
                  key={transaction.id}
                  onClick={() => setSelectedTransaction(transaction)}
                  className={`relative p-4 rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md ${
                    selectedTransaction?.id === transaction.id
                      ? "text-white"
                      : "bg-white hover:bg-gray-50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {selectedTransaction?.id === transaction.id && (
                    <motion.div
                      layoutId="activeTransaction"
                      className="absolute inset-0 bg-[var(--primary)] rounded-2xl shadow-md"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                  <div className="relative flex items-center gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-bold truncate ${
                          selectedTransaction?.id === transaction.id
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {transaction.transaction_description}
                      </h3>
                      <p
                        className={`text-sm truncate ${
                          selectedTransaction?.id === transaction.id
                            ? "text-gray-200"
                            : "text-gray-500"
                        }`}
                      >
                        {transaction.category.charAt(0).toUpperCase() +
                          transaction.category.slice(1)}{" "}
                        • {transaction.merchant}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          selectedTransaction?.id === transaction.id
                            ? "text-gray-300"
                            : "text-gray-400"
                        }`}
                      >
                        {new Date(
                          transaction.transaction_date,
                        ).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <span
                        className={`text-lg font-bold block ${
                          isExpense
                            ? "text-red-600"
                            : isIncome
                              ? "text-green-600"
                              : "text-gray-900"
                        }`}
                      >
                        {isExpense ? "-" : "+"}${transaction.amount}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
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
                  <div className="col-span-2">
                    <span className="text-[var(--text-secondary)]">
                      Comercio:
                    </span>
                    <p className="font-medium flex items-center gap-1">
                      <Store size={16} />
                      {selectedTransaction.merchant}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[var(--text-secondary)]">
                      Categoría:
                    </span>
                    <p className="font-medium flex items-center gap-1">
                      <Receipt size={16} />
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                        {selectedTransaction.category}
                      </span>
                    </p>
                  </div>
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
