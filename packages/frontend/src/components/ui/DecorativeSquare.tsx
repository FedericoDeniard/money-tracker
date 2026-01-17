interface DecorativeSquareProps {
  size?: number;
  className?: string;
}

export function DecorativeSquare({ size = 100, className = '' }: DecorativeSquareProps) {
  return (
    <div 
      className={`bg-[var(--accent)] rounded-[3rem] opacity-90 ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        transform: 'rotate(16deg)'
      }}
    />
  );
}
