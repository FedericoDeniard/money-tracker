interface SuspenseFallbackProps {
    rows?: number;
    className?: string;
}

export function SuspenseFallback({ rows = 3, className = "" }: SuspenseFallbackProps) {
    return (
        <div className={`space-y-3 animate-pulse ${className}`}>
            {Array.from({ length: rows }).map((_, i) => (
                <div
                    key={i}
                    className="h-14 rounded-xl bg-[var(--bg-secondary)] opacity-60"
                    style={{ opacity: 1 - i * 0.15 }}
                />
            ))}
        </div>
    );
}

export function SuspenseFallbackCard({ className = "" }: { className?: string }) {
    return (
        <div className={`rounded-2xl border border-[var(--text-secondary)]/20 bg-[var(--bg-primary)] p-5 shadow-sm animate-pulse ${className}`}>
            <div className="h-4 w-1/3 rounded-md bg-[var(--bg-secondary)] mb-4" />
            <div className="space-y-2">
                <div className="h-3 w-full rounded-md bg-[var(--bg-secondary)]" />
                <div className="h-3 w-4/5 rounded-md bg-[var(--bg-secondary)]" />
            </div>
        </div>
    );
}

export function SuspenseFallbackPage({ className = "" }: { className?: string }) {
    return (
        <div className={`flex items-center justify-center h-64 ${className}`}>
            <div className="space-y-3 w-full max-w-sm animate-pulse">
                <div className="h-6 w-1/2 rounded-md bg-[var(--bg-secondary)] mx-auto" />
                <div className="h-3 w-3/4 rounded-md bg-[var(--bg-secondary)] mx-auto" />
            </div>
        </div>
    );
}
