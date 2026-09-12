import { describe, expect, it } from "vitest";

import { BETA_ALLOWLIST, BETA_LOCKED, isBetaAllowed } from "./access";

describe("access gate", () => {
  it("is open, so signups are no longer restricted", () => {
    expect(BETA_LOCKED).toBe(false);
    expect(isBetaAllowed("someone@example.com")).toBe(true);
    expect(isBetaAllowed(null)).toBe(true);
  });

  it("allows every prepared account", () => {
    for (const email of BETA_ALLOWLIST) {
      expect(isBetaAllowed(email)).toBe(true);
    }
  });
});
