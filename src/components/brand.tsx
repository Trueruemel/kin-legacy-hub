import { cn } from "@/lib/utils";
import wordmark from "@/assets/wordmark.png";

export function TreeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <path
        d="M16 30v-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
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

export function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src={wordmark}
      alt="Eternal — Memories"
      className={cn("h-8 w-auto object-contain", className)}
      width={1920}
      height={512}
    />
  );
}
