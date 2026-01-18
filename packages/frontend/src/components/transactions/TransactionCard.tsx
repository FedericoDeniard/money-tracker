import { motion } from "framer-motion";
import type { Transaction } from "../../services/transactions.service";
import { getTransactionType } from "../../utils/transactionUtils";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import { useFormatDate } from "../../hooks/useFormatDate";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { gmailService } from "../../services/gmail.service";
import { getCurrencySymbol } from "../../utils/currency";
import { useEffect, useState } from "react";

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
  const { translateCategory } = useTranslateCategory();
  const { formatShortDate } = useFormatDate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [gmailConnections, setGmailConnections] = useState(0);

  useEffect(() => {
    const checkConnections = async () => {
      if (user?.id) {
        const status = await gmailService.getConnectionStatus(user.id);
        setGmailConnections(status.total);
      }
    };
    checkConnections();
  }, [user?.id]);

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
            {translateCategory(transaction.category)} •{" "}
            {transaction.merchant || t("transactions.unknown")}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              isSelected ? "text-gray-300" : "text-gray-400"
            }`}
          >
            {formatShortDate(transaction.transaction_date)}
            {gmailConnections > 1 && transaction.recipient_email && (
              <> • {transaction.recipient_email}</>
            )}
          </p>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <span className={`text-lg font-bold block ${colorClass}`}>
            {sign}
            {getCurrencySymbol(transaction.currency)}
            {transaction.amount}
          </span>
          <span
            className={`text-xs block ${
              isSelected ? "text-gray-300" : "text-gray-400"
            }`}
          >
            {transaction.currency}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
