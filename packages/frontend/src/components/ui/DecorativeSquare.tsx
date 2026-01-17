interface DecorativeSquareProps {
  size?: number;
  className?: string;
}

export function DecorativeSquare({ size = 12, className = '' }: DecorativeSquareProps) {
  return (
    <div 
      className={`w-${size} h-${size} bg-[var(--accent)] rounded-[3rem] opacity-90 ${className}`}
      style={{ transform: 'rotate(16deg)' }}
    />
  );
}
