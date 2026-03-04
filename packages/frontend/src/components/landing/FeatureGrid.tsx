import { motion } from "framer-motion";
import { Mail, Globe2, Sparkles, FileText, Repeat, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FeatureGrid() {
    const { t } = useTranslation();

    const features = [
        {
            icon: Mail,
            title: t("landing.features.gmail.title"),
            description: t("landing.features.gmail.description"),
            className: "md:col-span-2 bg-[var(--bg-secondary)]",
            iconColor: "text-[var(--button-primary)]",
            glowColor: "bg-[var(--button-primary)]"
        },
        {
            icon: Sparkles,
            title: t("landing.features.ai.title"),
            description: t("landing.features.ai.description"),
            className: "bg-[var(--primary)] text-white",
            iconColor: "text-[var(--accent)]",
            glowColor: "bg-[var(--accent)]",
            dark: true
        },
        {
            icon: Globe2,
            title: t("landing.features.currency.title"),
            description: t("landing.features.currency.description"),
            className: "bg-white",
            iconColor: "text-[var(--primary)]",
            glowColor: "bg-[var(--primary)]"
        },
        {
            icon: FileText,
            title: t("landing.features.documents.title"),
            description: t("landing.features.documents.description"),
            className: "bg-white",
            iconColor: "text-[var(--success)]",
            glowColor: "bg-[var(--success)]"
        },
        {
            icon: Repeat,
            title: t("landing.features.subscriptions.title"),
            description: t("landing.features.subscriptions.description"),
            className: "bg-white",
            iconColor: "text-[var(--warning)]",
            glowColor: "bg-[var(--warning)]"
        },
        {
            icon: ShieldCheck,
            title: t("landing.features.security.title"),
            description: t("landing.features.security.description"),
            className: "md:col-span-3 bg-[var(--bg-secondary)] flex flex-col md:flex-row items-center gap-6 text-center md:text-left",
            iconColor: "text-slate-600",
            glowColor: "bg-slate-400"
        }
    ];

    return (
        <section className="py-24 bg-[var(--bg-primary)]">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-4"
                    >
                        {t("landing.features.title")} <br className="hidden md:block" /> {t("landing.features.subtitle")}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.1 }}
                        className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg"
                    >
                        {t("landing.features.description")}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ type: "spring", stiffness: 300, damping: 30, delay: idx * 0.1 }}
                            whileHover={{ y: -5 }}
                            className={`relative overflow-hidden group rounded-2xl border border-[var(--text-secondary)]/10 p-8 shadow-sm hover:shadow-xl transition-all ${feature.className}`}
                        >
                            {/* Subtle hover glow effect */}
                            <div className={`absolute -right-20 -top-20 w-40 h-40 ${feature.glowColor} rounded-full mix-blend-multiply filter blur-[64px] opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                            <div className="relative z-10 w-full">
                                <div className={`w-12 h-12 rounded-xl mb-6 flex items-center justify-center ${feature.dark ? 'bg-white/10' : 'bg-white shadow-sm border border-gray-100'}`}>
                                    <feature.icon className={feature.iconColor} size={24} />
                                </div>
                                <div className={feature.dark ? "w-full" : ""}>
                                    <h3 className={`text-xl font-bold mb-3 ${feature.dark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                                        {feature.title}
                                    </h3>
                                    <p className={`leading-relaxed ${feature.dark ? 'text-gray-300' : 'text-[var(--text-secondary)]'}`}>
                                        {feature.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
