import { motion } from "framer-motion";
import { Mail, Globe2, Sparkles, FileText, Repeat, ShieldCheck, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

export function FeatureGrid() {
    const { t } = useTranslation();

    const features = [
        {
            icon: Mail,
            title: t("landing.features.gmail.title"),
            description: t("landing.features.gmail.description"),
        },
        {
            icon: Sparkles,
            title: t("landing.features.ai.title"),
            description: t("landing.features.ai.description"),
        },
        {
            icon: Globe2,
            title: t("landing.features.currency.title"),
            description: t("landing.features.currency.description"),
        },
        {
            icon: FileText,
            title: t("landing.features.documents.title"),
            description: t("landing.features.documents.description"),
        },
        {
            icon: Repeat,
            title: t("landing.features.subscriptions.title"),
            description: t("landing.features.subscriptions.description"),
        },
        {
            icon: ShieldCheck,
            title: t("landing.features.security.title"),
            description: t("landing.features.security.description"),
        }
    ];

    return (
        <section className="py-24 bg-white relative z-10">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[1280px]">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="text-4xl md:text-[2.75rem] font-normal text-gray-900 mb-6 tracking-tight leading-tight"
                    >
                        {t("landing.features.title")} <br className="hidden md:block" /> {t("landing.features.subtitle")}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-gray-500 max-w-2xl mx-auto text-lg"
                    >
                        {t("landing.features.description")}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                            className="group relative bg-[#FAFAFA] hover:bg-white border border-gray-200 hover:border-[var(--button-primary)]/30 transition-colors duration-300 p-8 flex flex-col h-full min-h-[320px]"
                        >
                            <div className="flex justify-between items-start w-full mb-auto">
                                <div className="w-12 h-12 flex items-center justify-center text-[var(--button-primary)] opacity-90 group-hover:opacity-100 transition-opacity">
                                    <feature.icon strokeWidth={1} width={48} height={48} />
                                </div>
                                <Plus strokeWidth={1.5} className="w-4 h-4 text-gray-400 group-hover:text-[var(--button-primary)] transition-colors duration-300" />
                            </div>

                            <div className="mt-16">
                                <h3 className="text-xl font-medium text-gray-900 mb-3 tracking-tight">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 text-[15px] leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
