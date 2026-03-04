import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { DecorativeSquare } from "../ui/DecorativeSquare";
import { useTranslation } from "react-i18next";

export function HeroSection() {
    const { t } = useTranslation();

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
                    <div className="relative rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-secondary)] shadow-2xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--text-secondary)]/10 bg-white/50">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-amber-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="p-8 pb-32 grid grid-cols-1 md:grid-cols-3 gap-6 opacity-80 pointer-events-none select-none">
                            {/* Fake dashboard cards */}
                            <div className="h-40 rounded-xl bg-white border border-[var(--text-secondary)]/10 p-6 flex flex-col justify-between">
                                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                                    <DecorativeSquare size={24} className="text-[var(--primary)]" />
                                </div>
                                <div>
                                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                                    <div className="h-8 w-32 bg-gray-300 rounded" />
                                </div>
                            </div>
                            <div className="h-40 rounded-xl bg-white border border-[var(--text-secondary)]/10 p-6 flex flex-col justify-between hidden md:flex">
                                <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                                    <div className="w-6 h-6 rounded bg-[var(--success)]/50" />
                                </div>
                                <div>
                                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                                    <div className="h-8 w-32 bg-[var(--success)]/30 rounded" />
                                </div>
                            </div>
                            <div className="h-40 rounded-xl bg-white border border-[var(--text-secondary)]/10 p-6 flex flex-col justify-between hidden md:flex">
                                <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center">
                                    <div className="w-6 h-6 rounded bg-[var(--warning)]/50" />
                                </div>
                                <div>
                                    <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                                    <div className="h-8 w-32 bg-[var(--warning)]/30 rounded" />
                                </div>
                            </div>
                            <div className="md:col-span-3 h-64 rounded-xl bg-white border border-[var(--text-secondary)]/10 p-6">
                                <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
                                <div className="flex items-end gap-2 h-40">
                                    {[40, 70, 45, 90, 65, 85, 55, 100, 75, 60].map((h, i) => (
                                        <div key={i} className="flex-1 bg-[var(--primary)]/20 rounded-t-sm" style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
