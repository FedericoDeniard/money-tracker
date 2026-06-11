export function TypingIndicator() {
  return (
    <div className="flex w-fit items-center gap-1" role="status">
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-[var(--success)]/70 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-[var(--success)]/70 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-[var(--success)]/70 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
      <span className="sr-only">Assistant is typing</span>
    </div>
  );
}
