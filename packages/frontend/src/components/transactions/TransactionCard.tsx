import { LazyMotion, m, domAnimation } from "framer-motion";
import type { Transaction } from "../../services/transactions.service";
import { getTransactionType } from "../../utils/transactionUtils";
import { useTranslateCategory } from "../../hooks/useTranslateCategory";
import { useFormatDate } from "../../hooks/useFormatDate";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { gmailService } from "../../services/gmail.service";
import { getCurrencySymbol } from "../../utils/currency";
import { useEffect, useState } from "react";
import { TagBadge } from "../tags/TagBadge";

const MAX_VISIBLE_TAGS = 3;

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
  const { sign, colorClass } = getTransactionType(
    transaction.transaction_type as "income" | "expense" | "ingreso" | "egreso"
  );
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
    <LazyMotion features={domAnimation}>
      <m.div
        onClick={onClick}
        className={`relative p-4 rounded-2xl transition-all cursor-pointer shadow-sm hover:shadow-md ${
          isSelected ? "text-white" : "bg-white hover:bg-zinc-50"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isSelected && (
          <m.div
            layoutId="activeTransaction"
            className="absolute inset-0 bg-[var(--primary)] rounded-2xl shadow-md"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        <div className="relative flex items-center gap-4">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold truncate ${
                isSelected ? "text-white" : "text-[var(--text-primary)]"
              }`}
            >
              {transaction.name}
            </h3>
            <p
              className={`text-sm truncate ${
                isSelected ? "text-zinc-200" : "text-[var(--text-secondary)]"
              }`}
            >
              {translateCategory(transaction.category)} •{" "}
              {transaction.merchant || t("transactions.unknown")}
            </p>
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {transaction.tags.slice(0, MAX_VISIBLE_TAGS).map(tag => (
                  <TagBadge
                    key={tag.id}
                    name={tag.name}
                    color={tag.color}
                    size="sm"
                  />
                ))}
                {transaction.tags.length > MAX_VISIBLE_TAGS && (
                  <span
                    className={`text-xs font-medium ${
                      isSelected ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    +{transaction.tags.length - MAX_VISIBLE_TAGS}
                  </span>
                )}
              </div>
            )}
            <p
              className={`text-xs mt-0.5 ${
                isSelected ? "text-zinc-300" : "text-zinc-400"
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
                isSelected ? "text-zinc-300" : "text-zinc-400"
              }`}
            >
              {transaction.currency}
            </span>
          </div>
        </div>
      </m.div>
    </LazyMotion>
  );
}
