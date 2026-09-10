import { useEffect, useRef, useState, type RefObject } from "react";

export type UseInViewOptions = {
  /** Share of the element that must be visible before it counts as "in view". */
  threshold?: number;
  /**
   * Shrinks the observed viewport a little so the flag does not flicker when an
   * element sits exactly on the edge of the screen.
   */
  rootMargin?: string;
};

/**
 * Bidirectional viewport observer for scroll-reveal effects.
 *
 * Progressive enhancement: `inView` starts as `true`, so server-rendered HTML
 * and browsers without JavaScript or IntersectionObserver show every element.
 * Once mounted, the observer takes over and flips the flag on every enter AND
 * every leave, so an effect builds up and down while scrolling in either
 * direction. The element is never unobserved until unmount.
 */
export function useInView<T extends HTMLElement>({
  threshold = 0.2,
  rootMargin = "0px 0px -10% 0px",
}: UseInViewOptions = {}): { ref: RefObject<T | null>; inView: boolean } {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    // Start hidden so elements already on screen get their entrance too; the
    // observer reports the real state on its first callback.
    setInView(false);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, inView };
}
