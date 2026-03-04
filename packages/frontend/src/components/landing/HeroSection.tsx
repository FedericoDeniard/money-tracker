import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { DecorativeSquare } from "../ui/DecorativeSquare";
import { useTranslation } from "react-i18next";
import logo from "../../logo.svg";
import { SubscriptionListItem } from "../subscriptions/SubscriptionListItem";
import { useState, useEffect } from "react";

export function HeroSection() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTab((prev) => (prev === 0 ? 1 : 0));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const subscriptionsMock = (
        <motion.div
            key="subscriptions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 p-8 pb-12 opacity-90 pointer-events-none select-none flex flex-col gap-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                        {t("navigation.subscriptions", "Subscriptions")}
                    </h2>
                    <p className="text-[var(--text-secondary)]">
                        {t("subscriptions.emptyDescription", "Automatic detection and tracking")}
                    </p>
                </div>
                <div className="text-right hidden sm:block">
                    <div className="text-sm text-[var(--text-secondary)]">Total (Monthly)</div>
                    <div className="text-xl font-bold text-[var(--text-primary)]">$71.18</div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {[
                    {
                        merchant_normalized: "netflix",
                        merchant_display: "Netflix",
                        avg_amount: 15.99,
                        currency: "USD",
                        frequency: "monthly" as const,
                        confidence_score: 95,
                        next_estimated_date: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
                        source_email_consistent: true,
                    },
                    {
                        merchant_normalized: "spotify",
                        merchant_display: "Spotify",
                        avg_amount: 9.99,
                        currency: "USD",
                        frequency: "monthly" as const,
                        confidence_score: 98,
                        next_estimated_date: new Date(Date.now() + 86400000 * 12).toISOString().split("T")[0],
                        source_email_consistent: true,
                    },
                    {
                        merchant_normalized: "aws",
                        merchant_display: "Amazon Web Services",
                        avg_amount: 45.20,
                        currency: "USD",
                        frequency: "monthly" as const,
                        confidence_score: 85,
                        next_estimated_date: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
                        source_email_consistent: false,
                    }
                ].map((sub, i) => (
                    <SubscriptionListItem key={i} candidate={sub as any} />
                ))}
            </div>
        </motion.div>
    );

    const transactionsMock = (
        <motion.div
            key="transactions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 p-8 pb-12 opacity-90 pointer-events-none select-none flex flex-col gap-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                        {t("navigation.transactions", "Transactions")}
                    </h2>
                    <p className="text-[var(--text-secondary)]">
                        {t("landing.features.gmail.title", "Recent Expenses")}
                    </p>
                </div>
                <div className="text-right hidden sm:block">
                    <div className="text-sm text-[var(--text-secondary)]">Balance</div>
                    <div className="text-xl font-bold text-emerald-600">+$2,450.00</div>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {[
                    { title: "Payment to Uber", category: "Transport • Uber", date: "Today", amount: "-$12.40", currency: "USD", color: "text-rose-600" },
                    { title: "CloudSafe annual plan", category: "Services • CloudSafe", date: "Feb 28", amount: "-$99", currency: "USD", color: "text-rose-600" },
                    { title: "Salary Deposit", category: "Income • Acme Corp", date: "Oct 24", amount: "+$3,200.00", currency: "USD", color: "text-emerald-500" },
                ].map((tx, i) => (
                    <div key={i} className="relative p-4 rounded-2xl transition-all shadow-sm bg-white border border-[var(--text-secondary)]/10 hover:bg-gray-50">
                        <div className="relative flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold truncate text-[var(--text-primary)]">{tx.title}</h3>
                                <p className="text-sm truncate text-[var(--text-secondary)]">{tx.category}</p>
                                <p className="text-xs mt-0.5 text-gray-400">{tx.date}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={`text-lg font-bold block ${tx.color}`}>{tx.amount}</span>
                                <span className="text-xs block text-gray-400">{tx.currency}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );

    return (
        <div className="relative overflow-hidden bg-[var(--bg-primary)] pt-16 sm:pt-24 lg:pt-32 pb-16">
            {/* Background decorations */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-[var(--accent)] rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" />
                <div className="absolute top-40 -left-40 w-96 h-96 bg-[var(--primary)] rounded-full mix-blend-multiply filter blur-[128px] opacity-10" />
            </div>

            <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--text-secondary)]/20 text-[var(--text-secondary)] mb-8"
                    >
                        <Sparkles size={16} className="text-[var(--accent)]" />
                        <span className="text-sm font-medium">{t("landing.hero.badge")}</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
                        className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-[var(--text-primary)] tracking-tight mb-8"
                    >
                        {t("landing.hero.titlePart1")} <br className="hidden sm:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--button-primary)]">
                            {t("landing.hero.titlePart2")}
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
                        className="text-xl sm:text-2xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed"
                    >
                        {t("landing.hero.description")}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            to="/register"
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[var(--button-primary)] hover:bg-[var(--button-primary-hover)] text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            {t("landing.hero.getStarted")}
                            <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="https://federicodeniard-money-tracker.mintlify.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto flex items-center justify-center px-8 py-4 bg-[var(--bg-secondary)] hover:bg-gray-100 text-[var(--text-primary)] border border-[var(--text-secondary)]/20 rounded-xl font-semibold transition-all"
                        >
                            {t("landing.hero.readDocs")}
                        </Link>
                    </motion.div>
                </div>

                {/* Mockup Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.5 }}
                    className="mt-20 relative max-w-5xl mx-auto"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent z-10 pointer-events-none" />
                    <div className="relative rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-secondary)] shadow-2xl overflow-hidden h-[500px]">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--text-secondary)]/10 bg-white/50 relative z-20">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-amber-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>

                        <div className="relative w-full h-[calc(100%-49px)] overflow-hidden">
                            <AnimatePresence initial={false}>
                                {activeTab === 0 ? subscriptionsMock : transactionsMock}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
