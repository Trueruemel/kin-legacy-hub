import { describe, expect, it } from "vitest";

import { SAFE_ERROR_CATEGORIES, classifySafeError } from "./redact";

/** Fragments that must never appear in a classification result. */
const SECRET_FRAGMENTS = [
  "vault-entry-77",
  "sk_live_ABC123",
  "https://ai.gateway.lovable.dev",
  "family@example.com",
  "/home/user/app/src/lib/vault.functions.ts",
  "Grandma's letter",
  "row-level security",
];

function withStatus(status: number, message = "boom"): Error {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

function withStatusCode(statusCode: number, message = "boom"): Error {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

describe("classifySafeError — closed output", () => {
  it("exposes the six closed categories", () => {
    expect(SAFE_ERROR_CATEGORIES).toEqual([
      "configuration",
      "validation",
      "authentication",
      "rate_limit",
      "upstream",
      "unknown",
    ]);
  });

  it("returns only category (and optionally httpStatus) — never anything else", () => {
    const result = classifySafeError(withStatus(503, "upstream said: vault-entry-77 not found"));
    expect(Object.keys(result).sort()).toEqual(["category", "httpStatus"]);
    expect(result).toEqual({ category: "upstream", httpStatus: 503 });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("omits httpStatus entirely when the error carries none", () => {
    const result = classifySafeError(new Error("plain"));
    expect(Object.keys(result)).toEqual(["category"]);
    expect("httpStatus" in result).toBe(false);
  });

  it.each([
    [
      "an Error with message, stack and cause",
      Object.assign(new Error("Failed to load vault-entry-77 for family@example.com"), {
        cause: new Error(
          "row-level security violation at /home/user/app/src/lib/vault.functions.ts",
        ),
      }),
    ],
    [
      "an Error carrying a URL and a key",
      withStatus(500, "POST https://ai.gateway.lovable.dev failed with key sk_live_ABC123"),
    ],
    ["a string", "Grandma's letter could not be sealed"],
    [
      "a provider payload object",
      {
        status: 502,
        message: "Bad gateway",
        body: { title: "Grandma's letter", recipient: "family@example.com" },
        headers: { authorization: "Bearer sk_live_ABC123" },
      },
    ],
    ["a Response", new Response("vault-entry-77", { status: 404 })],
    ["a Request", new Request("https://ai.gateway.lovable.dev/v1/chat/completions")],
    ["null", null],
    ["undefined", undefined],
    ["a number", 42],
  ])("never leaks content from %s", (_label, input) => {
    const result = classifySafeError(input);
    const serialised = JSON.stringify(result);
    for (const fragment of SECRET_FRAGMENTS) {
      expect(serialised).not.toContain(fragment);
    }
    expect(serialised).not.toMatch(/message|stack|cause|url|path|body|headers|token/i);
    expect(SAFE_ERROR_CATEGORIES).toContain(result.category);
    if (result.httpStatus !== undefined) {
      expect(Number.isInteger(result.httpStatus)).toBe(true);
      expect(result.httpStatus).toBeGreaterThanOrEqual(100);
      expect(result.httpStatus).toBeLessThanOrEqual(599);
    }
  });

  it("does not mutate or retain the original error", () => {
    const error = withStatus(429, "slow down");
    const before = { ...error, message: error.message, stack: error.stack };
    const result = classifySafeError(error);
    expect({ ...error, message: error.message, stack: error.stack }).toEqual(before);
    expect(Object.values(result)).not.toContain(error);
  });
});

describe("classifySafeError — categorisation", () => {
  it("maps 401 and 403 to authentication", () => {
    expect(classifySafeError(withStatus(401))).toEqual({
      category: "authentication",
      httpStatus: 401,
    });
    expect(classifySafeError(withStatusCode(403))).toEqual({
      category: "authentication",
      httpStatus: 403,
    });
  });

  it("maps 429 to rate_limit", () => {
    expect(classifySafeError(withStatus(429))).toEqual({ category: "rate_limit", httpStatus: 429 });
  });

  it("maps 400, 404, 409 and 422 to validation", () => {
    for (const status of [400, 404, 409, 422]) {
      expect(classifySafeError(withStatus(status))).toEqual({
        category: "validation",
        httpStatus: status,
      });
    }
  });

  it("maps 5xx to upstream", () => {
    for (const status of [500, 502, 503, 504]) {
      expect(classifySafeError(withStatus(status))).toEqual({
        category: "upstream",
        httpStatus: status,
      });
    }
  });

  it("maps a Zod-style validation error to validation without a status", () => {
    const zodLike = Object.assign(new Error("invalid input"), { name: "ZodError" });
    expect(classifySafeError(zodLike)).toEqual({ category: "validation" });
  });

  it("maps fetch/abort/network failures to upstream", () => {
    const abort = Object.assign(new Error("The operation was aborted"), { name: "AbortError" });
    expect(classifySafeError(abort)).toEqual({ category: "upstream" });
    expect(classifySafeError(new TypeError("fetch failed"))).toEqual({ category: "upstream" });
  });

  it("maps a missing-configuration error to configuration", () => {
    expect(classifySafeError(new Error("The story writer is not configured."))).toEqual({
      category: "configuration",
    });
    expect(classifySafeError(new Error("LOVABLE_API_KEY is not configured"))).toEqual({
      category: "configuration",
    });
  });

  it("falls back to unknown", () => {
    expect(classifySafeError(new Error("something odd"))).toEqual({ category: "unknown" });
    expect(classifySafeError("text")).toEqual({ category: "unknown" });
    expect(classifySafeError(null)).toEqual({ category: "unknown" });
    expect(classifySafeError({ weird: true })).toEqual({ category: "unknown" });
  });

  it("ignores statuses that are not valid HTTP status integers", () => {
    expect(classifySafeError(withStatus(0))).toEqual({ category: "unknown" });
    expect(classifySafeError(withStatus(999))).toEqual({ category: "unknown" });
    expect(classifySafeError({ status: "500" })).toEqual({ category: "unknown" });
    expect(classifySafeError({ status: 500.5 })).toEqual({ category: "unknown" });
  });

  it("reads the status of a Response without reading its body", () => {
    expect(classifySafeError(new Response("secret body", { status: 401 }))).toEqual({
      category: "authentication",
      httpStatus: 401,
    });
  });
});
