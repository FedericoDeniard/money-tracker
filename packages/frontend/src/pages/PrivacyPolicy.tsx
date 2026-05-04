import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DecorativeSquare } from "../components/ui/DecorativeSquare";
import logo from "../logo.svg";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5 text-[var(--text-secondary)] leading-relaxed">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-[var(--text-secondary)]/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <DecorativeSquare size={32} className="absolute inset-0 m-auto" />
              <img
                src={logo}
                alt="Money Tracker Logo"
                className="relative z-10 w-full h-full p-1 object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">
              Money Tracker
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          {t("privacy.title")}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]/60 mb-10">
          {t("privacy.lastUpdated", { date: "4 de mayo de 2026" })}
        </p>

        <Section title={t("privacy.controller.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.controller.content")}
          </p>
        </Section>

        <Section title={t("privacy.dataCollected.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-3">
            {t("privacy.dataCollected.intro")}
          </p>
          <List
            items={t("privacy.dataCollected.items", { returnObjects: true })}
          />
        </Section>

        <Section title={t("privacy.purpose.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.purpose.content")}
          </p>
        </Section>

        <Section title={t("privacy.aiProcessing.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.aiProcessing.content")}
          </p>
        </Section>

        <Section title={t("privacy.thirdParties.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-3">
            {t("privacy.thirdParties.intro")}
          </p>
          <List
            items={t("privacy.thirdParties.items", { returnObjects: true })}
          />
        </Section>

        <Section title={t("privacy.security.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.security.content")}
          </p>
        </Section>

        <Section title={t("privacy.localStorage.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.localStorage.content")}
          </p>
        </Section>

        <Section title={t("privacy.pushNotifications.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.pushNotifications.content")}
          </p>
        </Section>

        <Section title={t("privacy.retention.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.retention.content")}
          </p>
        </Section>

        <Section title={t("privacy.rights.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed mb-3">
            {t("privacy.rights.intro")}
          </p>
          <List items={t("privacy.rights.items", { returnObjects: true })} />
        </Section>

        <Section title={t("privacy.contact.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.contact.content")}
          </p>
        </Section>

        <Section title={t("privacy.changes.title")}>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            {t("privacy.changes.content")}
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--text-secondary)]/10 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-[var(--text-secondary)]/60">
          &copy; {new Date().getFullYear()} Money Tracker.
        </div>
      </footer>
    </div>
  );
}
