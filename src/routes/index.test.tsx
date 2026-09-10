import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* ---- module doubles: no router, no navigation ------------------------- */

const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
  useNavigate: () => navigate,
  Link: ({
    to,
    search,
    children,
    ...rest
  }: {
    to: string;
    search?: Record<string, string>;
    children?: React.ReactNode;
  }) => (
    <a href={search?.["next"] ? `${to}?next=${search["next"]}` : to} {...rest}>
      {children}
    </a>
  ),
}));

const { LandingPage, createMemoryNext } = await import("./index");

beforeEach(() => vi.clearAllMocks());

describe("homepage — structure", () => {
  it("leads with the one message and the one action", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Capture a story while you can still ask it.",
    );
    expect(
      screen.getAllByRole("button", { name: /Start with one question/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Explore the demo archive/ })).toHaveAttribute(
      "href",
      "/demo",
    );
  });

  it("keeps the sections in the agreed order", () => {
    render(<LandingPage />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Capture. Give context. Pass it on.",
      "The story behind a photograph deserves to be asked for.",
      "You do not need to organise everything today.",
      "A place to begin. Room to grow.",
      "Private by default. Clear by design.",
    ]);
  });

  it("offers a skip link, a primary nav and a keyboard-operable mobile menu", async () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    const menu = screen.getByRole("button", { name: "Open menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(menu);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
  });

  it("does not touch auth or the database", () => {
    // The page must stay static: the only side effect is navigation on click.
    render(<LandingPage />);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("homepage — first-memory preview", () => {
  it("sends the chosen question along to /auth as an internal next path", async () => {
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("radio", { name: /Something worth passing on/ }));
    await userEvent.click(screen.getByRole("button", { name: /Continue with this question/ }));
    expect(navigate).toHaveBeenCalledWith({
      to: "/auth",
      search: { next: "/create-memory?prompt=pass-on" },
    });
  });

  it("defaults to the first question for the hero button", async () => {
    render(<LandingPage />);
    await userEvent.click(screen.getAllByRole("button", { name: /Start with one question/ })[0]!);
    expect(navigate).toHaveBeenCalledWith({
      to: "/auth",
      search: { next: "/create-memory?prompt=still-see" },
    });
  });

  it("builds only internal next paths (open-redirect guard stays meaningful)", () => {
    expect(createMemoryNext("still-see")).toBe("/create-memory?prompt=still-see");
    expect(createMemoryNext("a b/c")).toBe("/create-memory?prompt=a%20b%2Fc");
    expect(createMemoryNext("x").startsWith("/")).toBe(true);
    expect(createMemoryNext("x").startsWith("//")).toBe(false);
  });
});
