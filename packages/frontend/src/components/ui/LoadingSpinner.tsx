interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-12",
    lg: "size-16",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent ${sizeClasses[size]} ${className}`}
    ></div>
  );
}
