import { motion } from "framer-motion";
import type { Transaction } from "../../services/emails.service";
import {
  getTransactionType,
  formatCategory,
  formatShortDate,
} from "../../utils/transactionUtils";

interface TransactionCardProps {
  transaction: Transaction;
  isSelected: boolean;
  onClick: () => void;
}

export function TransactionCard({
  transaction,
  isSelected,
  onClick,
}: TransactionCardProps) {
  const { sign, colorClass } = getTransactionType(transaction.transaction_type);

  return (
    <motion.div
      onClick={onClick}
      className={`relative p-4 rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md ${
        isSelected ? "text-white" : "bg-white hover:bg-gray-50"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isSelected && (
        <motion.div
          layoutId="activeTransaction"
          className="absolute inset-0 bg-[var(--primary)] rounded-2xl shadow-md"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <div className="relative flex items-center gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold truncate ${
              isSelected ? "text-white" : "text-[var(--text-primary)]"
            }`}
          >
            {transaction.transaction_description}
          </h3>
          <p
            className={`text-sm truncate ${
              isSelected ? "text-gray-200" : "text-[var(--text-secondary)]"
            }`}
          >
            {formatCategory(transaction.category)} • {transaction.merchant}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              isSelected ? "text-gray-300" : "text-gray-400"
            }`}
          >
            {formatShortDate(transaction.transaction_date)}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold block ${colorClass}`}>
            {sign}${transaction.amount}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
