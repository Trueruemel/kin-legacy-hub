import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => opts,
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

const { DemoArchivePage } = await import("./demo");

beforeEach(() => vi.clearAllMocks());

describe("public demo archive", () => {
  it("is clearly labelled as fictitious and links back home", () => {
    render(<DemoArchivePage />);
    expect(screen.getAllByText("Fictitious demo archive").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "The Johnson family archive",
    );
    expect(screen.getByRole("link", { name: /Back to home/ })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /Return to Eternal Memories/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows four generations and the three memory kinds", () => {
    render(<DemoArchivePage />);
    expect(screen.getByText("Four generations, one table")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The summer we built the treehouse" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Sunday lunch at the old house" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Mum's apple cake" })).toBeVisible();
    expect(screen.getByText("Audio story")).toBeInTheDocument();
    expect(screen.getByText("Photograph")).toBeInTheDocument();
    expect(screen.getByText("Recipe & story")).toBeInTheDocument();
  });

  it("uses no private storage URLs", () => {
    const { container } = render(<DemoArchivePage />);
    const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(sources.length).toBeGreaterThan(0);
    for (const src of sources) {
      expect(src).not.toMatch(/supabase|storage|memories\//);
    }
  });

  it("hands over to /auth with the first-memory route as next", () => {
    render(<DemoArchivePage />);
    expect(screen.getByRole("link", { name: /Start with one question/ })).toHaveAttribute(
      "href",
      "/auth?next=/create-memory",
    );
  });

  it("offers no entry into the legacy mock demo", () => {
    render(<DemoArchivePage />);
    expect(screen.queryByRole("button", { name: /interactive demo/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/interactive demo/i)).not.toBeInTheDocument();
  });
});
