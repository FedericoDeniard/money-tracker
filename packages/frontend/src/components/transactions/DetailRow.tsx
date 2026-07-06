interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[var(--text-secondary)] text-sm">{label}</span>
      <span className="text-[var(--text-primary)] font-medium text-sm text-right">
        {value}
      </span>
    </div>
  );
}
