import { describe, expect, it } from "vitest";

import { BETA_ALLOWLIST, isBetaAllowed } from "./access";

describe("closed-beta access gate", () => {
  it("allows every prepared account", () => {
    for (const email of BETA_ALLOWLIST) {
      expect(isBetaAllowed(email)).toBe(true);
    }
  });

  it("is case- and whitespace-insensitive", () => {
    expect(isBetaAllowed("  DEV1@EternalMemorys.Enterprises ")).toBe(true);
  });

  it("rejects unknown accounts", () => {
    expect(isBetaAllowed("someone@example.com")).toBe(false);
  });

  it("rejects missing emails", () => {
    expect(isBetaAllowed(null)).toBe(false);
    expect(isBetaAllowed(undefined)).toBe(false);
    expect(isBetaAllowed("")).toBe(false);
  });

  it("does not allow lookalike domains", () => {
    expect(isBetaAllowed("dev1@eternalmemorys.enterprises.evil.com")).toBe(false);
  });
});
