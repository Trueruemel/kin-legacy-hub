import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useParallax } from "./use-parallax";

function Probe({ factor }: { factor?: number }) {
  const ref = useRef<HTMLImageElement>(null);
  useParallax(ref, factor);
  return <img ref={ref} alt="" />;
}

function mockMatchMedia(reduce: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches: reduce,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", () => media);
  return {
    media,
    setReduce(value: boolean) {
      media.matches = value;
      listeners.forEach((fn) => fn());
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

describe("useParallax", () => {
  it("moves the element at a fraction of the scroll distance", () => {
    mockMatchMedia(false);
    const { container } = render(<Probe factor={0.2} />);
    const img = container.firstChild as HTMLImageElement;

    Object.defineProperty(window, "scrollY", { value: 500, configurable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(img.style.transform).toBe("translate3d(0, 100px, 0)");
  });

  it("stays static under prefers-reduced-motion, and resets when the preference flips on", () => {
    const control = mockMatchMedia(true);
    const { container } = render(<Probe />);
    const img = container.firstChild as HTMLImageElement;

    Object.defineProperty(window, "scrollY", { value: 800, configurable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(img.style.transform).toBe("");

    act(() => control.setReduce(false));
    expect(img.style.transform).toBe("translate3d(0, 160px, 0)");

    act(() => control.setReduce(true));
    expect(img.style.transform).toBe("");
  });

  it("removes the listener and the transform on unmount", () => {
    mockMatchMedia(false);
    const { container, unmount } = render(<Probe />);
    const img = container.firstChild as HTMLImageElement;
    unmount();
    Object.defineProperty(window, "scrollY", { value: 300, configurable: true });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(img.style.transform).toBe("");
  });
});
