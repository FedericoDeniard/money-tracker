import { useTranslation } from "react-i18next";
import { useSubscriptionTransactions } from "../../hooks/useSubscriptionTransactions";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { useFormatDate } from "../../hooks/useFormatDate";
import { formatCurrency } from "../../utils/currency";

interface SubscriptionTransactionsListProps {
    merchantNormalized: string;
    currency: string;
}

export function SubscriptionTransactionsList({ merchantNormalized, currency }: SubscriptionTransactionsListProps) {
    const { t } = useTranslation();
    const { formatShortDate } = useFormatDate();
    const { data: transactions, isLoading, error } = useSubscriptionTransactions(merchantNormalized, currency);

    if (isLoading) {
        return (
            <div className="flex justify-center p-4">
                <LoadingSpinner size="sm" />
            </div>
        );
    }

    if (error || !transactions) {
        return (
            <div className="text-center p-4 text-sm text-[var(--error)]">
                {t("errors.loadingError")}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="text-center p-4 text-sm text-[var(--text-secondary)]">
                {t("metrics.noData")}
            </div>
        );
    }

    return (
        <div className="mt-4 pt-4 border-t border-[var(--text-secondary)]/20">
            <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                {t("history", "Transaction History")}
            </h4>
            <div className="flex flex-col overflow-hidden rounded-lg border border-[var(--text-secondary)]/10 bg-[var(--bg-primary)]">
                {transactions.map((tx, index) => (
                    <div
                        key={tx.id}
                        className={`flex items-center justify-between py-2 px-3 ${index !== transactions.length - 1 ? 'border-b border-[var(--text-secondary)]/10' : ''
                            } hover:bg-[var(--bg-secondary)]/30 transition-colors`}
                    >
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-[var(--text-primary)] leading-tight">
                                {formatShortDate(tx.transaction_date, true)}
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] leading-tight mt-0.5 truncate max-w-[150px] sm:max-w-[200px]">
                                {tx.merchant}
                            </span>
                        </div>
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                            {formatCurrency(tx.amount || 0, tx.currency)} <span className="text-[10px] font-normal text-[var(--text-secondary)]">{tx.currency}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
