import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useInView } from "./use-in-view";

type Callback = (entries: { isIntersecting: boolean }[]) => void;

const observers: {
  callback: Callback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options: IntersectionObserverInit | undefined;
}[] = [];

class FakeIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(callback: Callback, options?: IntersectionObserverInit) {
    observers.push({ callback, observe: this.observe, disconnect: this.disconnect, options });
  }
}

function Probe() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} data-inview={inView ? "true" : "false"}>
      Content stays in the DOM whatever the state.
    </div>
  );
}

const originalObserver = globalThis.IntersectionObserver;

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.IntersectionObserver = originalObserver;
});

describe("useInView", () => {
  it("observes the element with the flicker buffer and starts hidden on the client", () => {
    const { container } = render(<Probe />);
    expect(observers).toHaveLength(1);
    expect(observers[0]!.observe).toHaveBeenCalledWith(container.firstChild);
    expect(observers[0]!.options).toEqual({ threshold: 0.2, rootMargin: "0px 0px -10% 0px" });
    expect(container.firstChild).toHaveAttribute("data-inview", "false");
  });

  it("flips both ways: in on enter, out on leave, in again — never unobserves", () => {
    const { container } = render(<Probe />);
    const { callback, disconnect } = observers[0]!;

    act(() => callback([{ isIntersecting: true }]));
    expect(container.firstChild).toHaveAttribute("data-inview", "true");

    act(() => callback([{ isIntersecting: false }]));
    expect(container.firstChild).toHaveAttribute("data-inview", "false");

    act(() => callback([{ isIntersecting: true }]));
    expect(container.firstChild).toHaveAttribute("data-inview", "true");
    expect(disconnect).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Content stays in the DOM");
  });

  it("disconnects on unmount", () => {
    const { unmount } = render(<Probe />);
    unmount();
    expect(observers[0]!.disconnect).toHaveBeenCalledTimes(1);
  });

  it("keeps everything visible when IntersectionObserver does not exist (progressive enhancement)", () => {
    vi.unstubAllGlobals();
    // @ts-expect-error — simulating an old browser
    delete globalThis.IntersectionObserver;
    const { container } = render(<Probe />);
    expect(container.firstChild).toHaveAttribute("data-inview", "true");
  });
});
