import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Reveal } from "./reveal";

describe("Reveal", () => {
  it("renders the requested element with the effect class and keeps its content", () => {
    render(
      <Reveal as="h2" effect="wipe" id="section-title" className="font-display">
        A place to begin.
      </Reveal>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "A place to begin." });
    expect(heading).toHaveAttribute("id", "section-title");
    expect(heading).toHaveClass("reveal-wipe", "font-display");
    // The whole heading stays one text node — nothing is split into spans.
    expect(heading.childNodes).toHaveLength(1);
  });

  it("is fully visible in server-rendered HTML (no JS needed to read the page)", () => {
    const html = renderToString(
      <Reveal effect="fade" delay={120}>
        <p>Visible without JavaScript.</p>
      </Reveal>,
    );
    expect(html).toContain('data-inview="true"');
    expect(html).toContain("--reveal-delay:120ms");
    expect(html).toContain("Visible without JavaScript.");
  });
});
