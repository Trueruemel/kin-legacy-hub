import { cn } from "@/lib/utils";
import wordmarkDark from "@/assets/wordmark-dark.png";
import wordmarkCream from "@/assets/wordmark-cream.png";

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

/**
 * Wordmark. `dark` is the cream mark for dark surfaces, `light` the ink mark
 * for linen surfaces. Sized generously so the brand reads as the anchor of
 * the header.
 */
export function Wordmark({
  className,
  variant = "auto",
}: {
  className?: string;
  variant?: "auto" | "dark" | "light";
}) {
  const base = "h-10 w-auto object-contain sm:h-11";
  if (variant === "dark") {
    return (
      <img
        src={wordmarkCream}
        alt="Eternal Memories"
        className={cn(base, className)}
        width={765}
        height={247}
      />
    );
  }
  if (variant === "light") {
    return (
      <img
        src={wordmarkDark}
        alt="Eternal Memories"
        className={cn(base, className)}
        width={829}
        height={279}
      />
    );
  }
  return (
    <>
      <img
        src={wordmarkDark}
        alt="Eternal Memories"
        className={cn(base, "dark:hidden", className)}
        width={829}
        height={279}
      />
      <img
        src={wordmarkCream}
        alt="Eternal Memories"
        className={cn(base, "hidden dark:block", className)}
        width={765}
        height={247}
      />
    </>
  );
}
