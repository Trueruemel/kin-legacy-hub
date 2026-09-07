import { cn } from "@/lib/utils";
import wordmarkDark from "@/assets/wordmark.png";
import wordmarkLight from "@/assets/wordmark-light.png";

export function TreeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <path d="M16 30v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path
        d="M16 21 9 16M16 21l7-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <circle cx="16" cy="8" r="6" fill="currentColor" opacity="0.9" />
      <circle cx="8" cy="14" r="4.4" fill="currentColor" opacity="0.6" />
      <circle cx="24" cy="14" r="4.4" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

export function Wordmark({
  className,
  variant = "auto",
}: {
  className?: string;
  variant?: "auto" | "dark" | "light";
}) {
  const base = "h-8 w-auto object-contain";
  if (variant === "dark") {
    return (
      <img
        src={wordmarkLight}
        alt="Eternal — Memories"
        className={cn(base, className)}
        width={1920}
        height={512}
      />
    );
  }
  if (variant === "light") {
    return (
      <img
        src={wordmarkDark}
        alt="Eternal — Memories"
        className={cn(base, className)}
        width={1920}
        height={512}
      />
    );
  }
  return (
    <>
      <img
        src={wordmarkDark}
        alt="Eternal — Memories"
        className={cn(base, "dark:hidden", className)}
        width={1920}
        height={512}
      />
      <img
        src={wordmarkLight}
        alt="Eternal — Memories"
        className={cn(base, "hidden dark:block", className)}
        width={1920}
        height={512}
      />
    </>
  );
}
