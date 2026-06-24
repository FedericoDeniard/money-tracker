export function TypingIndicator() {
  return (
    <output className="flex w-fit items-center gap-1">
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-[var(--success)]/70 animate-[typing_0.8s_ease-in-out_infinite]"
        style={{ animationDelay: "0ms" }}
      />
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-[var(--success)]/70 animate-[typing_0.8s_ease-in-out_infinite]"
        style={{ animationDelay: "150ms" }}
      />
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-[var(--success)]/70 animate-[typing_0.8s_ease-in-out_infinite]"
        style={{ animationDelay: "300ms" }}
      />
      <span className="sr-only">Assistant is typing</span>
    </output>
  );
}
