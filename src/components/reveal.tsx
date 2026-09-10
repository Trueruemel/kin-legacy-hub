import { createElement, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

export type RevealEffect = "fade" | "wipe" | "zoom";

const EFFECT_CLASS: Record<RevealEffect, string> = {
  fade: "reveal-fade",
  wipe: "reveal-wipe",
  zoom: "reveal-zoom",
};

type RevealTag =
  "div" | "section" | "figure" | "form" | "p" | "h1" | "h2" | "h3" | "ol" | "ul" | "li" | "span";

export type RevealProps = HTMLAttributes<HTMLElement> & {
  /** Element to render. Headings keep their semantics; nothing is split into spans. */
  as?: RevealTag;
  /** `fade`: opacity + 16px rise · `wipe`: clip-path sweep · `zoom`: scale 1.08 → 1 + opacity. */
  effect?: RevealEffect;
  /** Stagger, in milliseconds. Ignored under prefers-reduced-motion. */
  delay?: number;
  children?: ReactNode;
};

/**
 * Scroll-reveal wrapper. Rendered fully visible on the server; the client
 * toggles `data-inview` as the element enters and leaves the viewport (see
 * `useInView`). The CSS lives in `src/styles.css` under "Scroll reveal".
 */
export function Reveal({
  as = "div",
  effect = "fade",
  delay,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  const mergedStyle: CSSProperties | undefined =
    delay !== undefined ? ({ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties) : style;
  return createElement(
    as,
    {
      ...rest,
      ref,
      className: cn(EFFECT_CLASS[effect], className),
      "data-inview": inView ? "true" : "false",
      ...(mergedStyle ? { style: mergedStyle } : {}),
    },
    children,
  );
}
