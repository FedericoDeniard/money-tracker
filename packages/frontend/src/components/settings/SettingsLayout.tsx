import { useMemo, type ReactNode } from "react";
import { SettingsNav, type SettingsCategory } from "./SettingsNav";
import { useActiveSection } from "../../hooks/useActiveSection";

interface SettingsLayoutProps {
  categories: SettingsCategory[];
  children: ReactNode;
}

export function SettingsLayout({ categories, children }: SettingsLayoutProps) {
  const ids = useMemo(() => categories.map(c => c.id), [categories]);
  const { activeId, setManual } = useActiveSection(ids);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[10rem_1fr] gap-6 lg:gap-10">
      <SettingsNav
        categories={categories}
        activeId={activeId}
        onSelect={setManual}
      />
      <div className="flex justify-center min-w-0">
        <div className="w-full max-w-2xl space-y-4 pb-8">{children}</div>
      </div>
    </div>
  );
}
