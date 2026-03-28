import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}

export function QuickActionCard({
  title,
  description,
  icon,
  actionLabel,
  href,
  onClick,
  disabled = false,
  badge,
}: QuickActionCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="rounded-xl bg-[var(--bg-secondary)] p-2 text-[var(--text-secondary)]">
          {icon}
        </div>
        {badge && (
          <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            {badge}
          </span>
        )}
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>

      <div className="mt-4">
        {href ? (
          <Link to={href}>
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              fullWidth
              disabled={disabled}
            >
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowRight size={16} />}
            iconPosition="right"
            fullWidth
            disabled={disabled}
            onClick={onClick}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </article>
  );
}
