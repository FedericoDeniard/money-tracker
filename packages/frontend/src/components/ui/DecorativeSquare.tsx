interface DecorativeSquareProps {
  size?: number;
  className?: string;
}

export function DecorativeSquare({ size = 100, className = '' }: DecorativeSquareProps) {
  // Dynamic border radius based on size
  const getBorderRadius = (size: number) => {
    if (size <= 50) return 'rounded-lg';      // Small: 8px
    if (size <= 100) return 'rounded-xl';     // Medium: 12px  
    if (size <= 200) return 'rounded-2xl';    // Large: 16px
    return 'rounded-3xl';                      // Extra large: 24px
  };

  return (
    <div 
      className={`bg-[var(--accent)] ${getBorderRadius(size)} opacity-90 ${className}`}
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        transform: 'rotate(16deg)'
      }}
    />
  );
}
