import { HeroSection } from "../components/landing/HeroSection";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { HowItWorks } from "../components/landing/HowItWorks";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingPage() {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans selection:bg-[var(--accent)] selection:text-[var(--primary)]">
            {/* Header/Nav */}
            <header className="fixed top-0 w-full bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--text-secondary)]/10 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-[var(--primary)] flex items-center justify-center">
                            <div className="w-4 h-4 rounded-sm bg-[var(--accent)]" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">Money Tracker</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            {t("landing.nav.signIn")}
                        </Link>
                        <Link to="/register" className="text-sm font-medium bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)] transition-colors shadow-sm">
                            {t("landing.nav.getStarted")}
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-grow pt-16">
                <HeroSection />
                <FeatureGrid />
                <HowItWorks />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-[var(--text-secondary)]/10 py-12">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-[var(--primary)] flex items-center justify-center grayscale opacity-50">
                                <div className="w-3 h-3 rounded-sm bg-white" />
                            </div>
                            <span className="font-semibold text-[var(--text-secondary)]">Money Tracker</span>
                        </div>
                        <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
                            <a href="https://federicodeniard-money-tracker.mintlify.app/" className="hover:text-[var(--primary)] transition-colors">
                                {t("landing.nav.documentation")}
                            </a>
                            <a href="https://github.com/federicodeniard/money-tracker" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] transition-colors">
                                {t("landing.nav.github")}
                            </a>
                        </div>
                    </div>
                    <div className="mt-8 text-center text-sm text-[var(--text-secondary)]/60">
                        &copy; {new Date().getFullYear()} Money Tracker. {t("landing.nav.personalProject")}
                    </div>
                </div>
            </footer>
        </div>
    );
}
