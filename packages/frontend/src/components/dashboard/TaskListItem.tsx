import { Link } from "react-router-dom";
import { AlertCircle, Clock3, ShieldAlert } from "lucide-react";
import { Button } from "../ui/Button";

type TaskLevel = "info" | "warning" | "critical";

interface TaskListItemProps {
  title: string;
  description: string;
  level: TaskLevel;
  levelLabel: string;
  actionLabel?: string;
  actionPath?: string;
  onAction?: () => void;
  disabled?: boolean;
}

function getLevelStyles(level: TaskLevel) {
  if (level === "critical") {
    return {
      container: "border-rose-200 bg-rose-50/70",
      text: "text-rose-700",
      icon: <ShieldAlert size={16} className="text-rose-600" />,
    };
  }

  if (level === "warning") {
    return {
      container: "border-amber-200 bg-amber-50/70",
      text: "text-amber-700",
      icon: <AlertCircle size={16} className="text-amber-600" />,
    };
  }

  return {
    container: "border-blue-200 bg-blue-50/70",
    text: "text-blue-700",
    icon: <Clock3 size={16} className="text-blue-600" />,
  };
}

export function TaskListItem({
  title,
  description,
  level,
  levelLabel,
  actionLabel,
  actionPath,
  onAction,
  disabled = false,
}: TaskListItemProps) {
  const styles = getLevelStyles(level);

  return (
    <article
      className={`rounded-xl border p-4 transition-colors ${styles.container}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{styles.icon}</div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h4>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium ${styles.text}`}>
          {levelLabel}
        </span>
      </div>

      {actionLabel && (
        <div className="mt-3">
          {actionPath ? (
            <Link to={actionPath}>
              <Button size="sm" variant="outline" disabled={disabled}>
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onAction}
              disabled={disabled}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
