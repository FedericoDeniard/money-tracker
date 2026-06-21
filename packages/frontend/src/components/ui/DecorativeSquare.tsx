interface DecorativeSquareProps {
  size?: number;
  className?: string;
}

function getBorderRadius(size: number) {
  if (size <= 50) return "rounded-lg";
  if (size <= 100) return "rounded-xl";
  if (size <= 200) return "rounded-2xl";
  return "rounded-3xl";
}

export function DecorativeSquare({
  size = 100,
  className = "",
}: DecorativeSquareProps) {
  return (
    <div
      className={`bg-[var(--accent)] ${getBorderRadius(size)} opacity-90 ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: "rotate(16deg)",
      }}
    />
  );
}
