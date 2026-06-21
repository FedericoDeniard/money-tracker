import { useRef } from "react";
import { useTranslation } from "react-i18next";

export function FilterValueDateInput({
  filterValues,
  setFilterValues,
}: {
  filterValues: string[];
  setFilterValues: (filterValues: string[]) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center bg-[var(--bg-secondary)] px-2 h-full relative border-l border-[var(--text-secondary)]/20">
      <input
        ref={inputRef}
        type="date"
        aria-label={t("transactions.date", "Fecha")}
        className="bg-transparent outline-none text-[var(--text-primary)] min-w-[125px] sm:min-w-[135px] cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
        value={filterValues[0] || ""}
        onChange={e => setFilterValues([e.target.value])}
        onClick={_e => {
          if (typeof inputRef.current?.showPicker === "function") {
            try {
              inputRef.current.showPicker();
            } catch {
              // Ignore if already shown or not supported
            }
          }
        }}
      />
    </div>
  );
}
