import { useEffect, type RefObject } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Moves an element vertically at a fraction of the scroll speed.
 *
 * One passive scroll listener, throttled to one update per animation frame,
 * writing `transform` directly to the element (no React state, no re-render).
 * Off entirely when the person prefers reduced motion — the element stays
 * exactly where CSS put it, also if that preference changes while the page is
 * open.
 */
export function useParallax(ref: RefObject<HTMLElement | null>, factor = 0.2): void {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof window === "undefined" || typeof window.matchMedia !== "function")
      return;

    const media = window.matchMedia(REDUCED_MOTION);
    let enabled = !media.matches;
    let pending = false;
    let frame = 0;

    const apply = () => {
      pending = false;
      if (!enabled) return;
      element.style.transform = `translate3d(0, ${Math.round(window.scrollY * factor)}px, 0)`;
    };
    const onScroll = () => {
      if (!enabled || pending) return;
      pending = true;
      frame = window.requestAnimationFrame(apply);
    };
    const onPreferenceChange = () => {
      enabled = !media.matches;
      if (enabled) onScroll();
      else element.style.transform = "";
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    media.addEventListener("change", onPreferenceChange);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      media.removeEventListener("change", onPreferenceChange);
      if (frame) window.cancelAnimationFrame(frame);
      element.style.transform = "";
    };
  }, [ref, factor]);
}
