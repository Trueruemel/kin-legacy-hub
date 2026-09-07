import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SAFE_ERROR_MESSAGES, categorizeError, throwSafe } from "./safe-error";

/** Things a database or provider error may carry that must never reach a user. */
const LEAKS = [
  "vault_entries",
  "vault_entries_pkey",
  "row-level security",
  "policy",
  "duplicate key value violates unique constraint",
  "family_id",
  "42501",
  "23505",
  "PGRST116",
  "https://bnxdpwvdjwszshgzxrvr.supabase.co",
  "at /home/",
  "sk_live_ABC",
];

function pgError(code: string, message: string, extra: Record<string, unknown> = {}) {
  // Shape of a PostgrestError: no Error prototype, string code, message/details/hint.
  return { code, message, details: "Key (id)=(42) already exists.", hint: null, ...extra };
}

describe("categorizeError — Postgres/PostgREST codes", () => {
  it("maps permission and RLS errors to authentication", () => {
    expect(categorizeError(pgError("42501", "new row violates row-level security policy"))).toBe(
      "authentication",
    );
    expect(categorizeError(pgError("PGRST301", "JWT expired"))).toBe("authentication");
  });

  it("maps constraint and input errors to validation", () => {
    for (const code of ["23505", "23503", "23514", "23502", "22P02", "22001", "PGRST116"]) {
      expect(categorizeError(pgError(code, "x"))).toBe("validation");
    }
  });

  it("maps connection and unknown database codes to upstream", () => {
    for (const code of ["08006", "57P01", "XX000", "PGRST000"]) {
      expect(categorizeError(pgError(code, "x"))).toBe("upstream");
    }
  });

  it("falls back to the evidence classifier for everything else", () => {
    expect(categorizeError(new Error("The story writer is not configured."))).toBe("configuration");
    expect(categorizeError(Object.assign(new Error("x"), { status: 429 }))).toBe("rate_limit");
    expect(categorizeError(new Error("odd"))).toBe("unknown");
    expect(categorizeError(null)).toBe("unknown");
  });
});

describe("throwSafe", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws an Error whose message is one of the closed user texts", () => {
    expect.assertions(2);
    try {
      throwSafe(
        pgError("23505", "duplicate key value violates unique constraint"),
        "seal vault entry",
      );
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(Error);
      expect(Object.values(SAFE_ERROR_MESSAGES)).toContain((thrown as Error).message);
    }
  });

  it.each([
    [
      "an RLS violation",
      pgError("42501", "new row violates row-level security policy for table vault_entries"),
    ],
    [
      "a unique violation",
      pgError("23505", 'duplicate key value violates unique constraint "vault_entries_pkey"'),
    ],
    ["a missing row", pgError("PGRST116", "JSON object requested, multiple (or no) rows returned")],
    [
      "a provider error with URL and key",
      Object.assign(new Error("POST https://bnxdpwvdjwszshgzxrvr.supabase.co failed sk_live_ABC"), {
        status: 502,
      }),
    ],
    [
      "a stack-bearing error",
      Object.assign(new Error("boom"), { stack: "Error: boom\n    at /home/app/x.ts:1:1" }),
    ],
    ["a string", "policy family_id 42501"],
  ])("never forwards content from %s", (_label, input) => {
    let thrown: unknown;
    try {
      throwSafe(input, "test");
    } catch (e) {
      thrown = e;
    }
    const message = (thrown as Error).message;
    for (const leak of LEAKS) expect(message).not.toContain(leak);
    expect((thrown as Error).cause).toBeUndefined();
  });

  it("chooses the user text by category", () => {
    const expectMessage = (input: unknown, key: keyof typeof SAFE_ERROR_MESSAGES) => {
      try {
        throwSafe(input, "test");
      } catch (e) {
        expect((e as Error).message).toBe(SAFE_ERROR_MESSAGES[key]);
        return;
      }
      throw new Error("did not throw");
    };
    expectMessage(pgError("42501", "x"), "authentication");
    expectMessage(pgError("23505", "x"), "validation");
    expectMessage(Object.assign(new Error("x"), { status: 429 }), "rate_limit");
    expectMessage(new Error("LOVABLE_API_KEY is not configured"), "configuration");
    expectMessage(pgError("08006", "x"), "upstream");
    expectMessage(new Error("odd"), "unknown");
  });

  it("keeps the original error in the server log, tagged with the operation", () => {
    const original = pgError("23505", "duplicate key");
    try {
      throwSafe(original, "seal vault entry");
    } catch {
      // expected
    }
    expect(console.error).toHaveBeenCalledTimes(1);
    const call = (console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(String(call[0])).toContain("seal vault entry");
    expect(call).toContain(original);
  });

  it("is typed as never so callers can use it in expression position", () => {
    const value: number = (() => {
      try {
        return throwSafe(new Error("x"), "test");
      } catch {
        return 1;
      }
    })();
    expect(value).toBe(1);
  });
});
