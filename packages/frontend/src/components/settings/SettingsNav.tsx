import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface SettingsCategory {
  id: string;
  titleKey: string;
}

interface SettingsNavProps {
  categories: SettingsCategory[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function SettingsNav({
  categories,
  activeId,
  onSelect,
}: SettingsNavProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLAnchorElement | null> | null>(null);
  if (itemRefs.current === null) {
    itemRefs.current = new Map();
  }

  useEffect(() => {
    const active = itemRefs.current?.get(activeId);
    if (!active || !listRef.current) return;

    const list = listRef.current;
    const isFirst = activeId === categories[0]?.id;
    const isLast = activeId === categories[categories.length - 1]?.id;

    let targetScrollLeft: number;

    if (isFirst) {
      targetScrollLeft = 0;
    } else if (isLast) {
      targetScrollLeft = list.scrollWidth - list.clientWidth;
    } else {
      const listRect = list.getBoundingClientRect();
      const itemRect = active.getBoundingClientRect();
      targetScrollLeft =
        list.scrollLeft +
        (itemRect.left - listRect.left) -
        listRect.width / 2 +
        itemRect.width / 2;
      const maxScrollLeft = list.scrollWidth - list.clientWidth;
      targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
    }

    if (Math.abs(list.scrollLeft - targetScrollLeft) > 1) {
      list.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
    }
  }, [activeId, categories]);

  const links = useMemo(
    () =>
      categories.map(cat => ({
        id: cat.id,
        label: t(cat.titleKey),
        ref: (el: HTMLAnchorElement | null) => {
          if (el) itemRefs.current?.set(cat.id, el);
          else itemRefs.current?.delete(cat.id);
        },
      })),
    [categories, t]
  );

  return (
    <nav
      aria-label={t("settings.title")}
      className="lg:sticky lg:top-2 lg:self-start"
    >
      <div
        ref={listRef}
        className="flex gap-1 overflow-x-auto pb-2 lg:pb-0 lg:flex-col lg:gap-1 lg:overflow-visible -mx-1 px-1 scrollbar-none"
      >
        {links.map(link => {
          const isActive = link.id === activeId;
          return (
            <a
              key={link.id}
              ref={link.ref}
              href={`#${link.id}`}
              onClick={() => onSelect(link.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "shrink-0 inline-flex items-center gap-2 lg:gap-2.5 px-3 py-1.5 rounded-full lg:rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-[#3d5a80]/10 text-[#3d5a80]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full transition-colors hidden lg:block",
                  isActive ? "bg-[#3d5a80]" : "bg-transparent"
                )}
              />
              {link.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
