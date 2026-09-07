import { describe, expect, it } from "vitest";

import {
  ALLOWED_ATTRIBUTE_KEYS,
  EVIDENCE_EVENT_NAMES,
  EVIDENCE_OUTCOMES,
  EVIDENCE_SCHEMA_VERSION,
  EVIDENCE_SOURCES,
  MAX_ATTRIBUTE_STRING_LENGTH,
  assertEvidenceAttributes,
  createCorrelationId,
  createEvidenceEvent,
  type EvidenceAttributes,
} from "./contracts";

const CORRELATION_ID = "0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f";
const FIXED_NOW = new Date("2026-09-07T15:00:00.000Z");

/**
 * Attribute names that must never enter an evidence record. Every one of them is a
 * plausible thing a future integration might be tempted to attach — the contract has
 * to reject them by construction, not by convention.
 */
const FORBIDDEN_KEYS = [
  "email",
  "recipient",
  "name",
  "title",
  "content",
  "transcript",
  "media",
  "token",
  "authorization",
  "cookie",
  "requestBody",
  "responseBody",
  "stack",
  "message",
  "cause",
  "url",
  "query",
  "ip",
  "familyId",
  "userId",
  "entryId",
  "subject",
  "html",
  "text",
  "headers",
  "userAgent",
  "sessionId",
  "displayName",
  "model",
  "apiKey",
] as const;

function validAttributes(): Record<string, unknown> {
  return {
    routeTemplate: "/vault/$entryId",
    httpStatus: 200,
    durationMs: 1234,
    templateKey: "family-welcome",
    templateRevisionHash: "a".repeat(64),
    providerMessageId: "msg_01J8ZK3Q9X",
    providerEventId: "evt_01J8ZK3QAB",
    providerEventType: "delivered",
    errorCategory: "upstream",
  };
}

describe("evidence contract constants", () => {
  it("pins the schema version", () => {
    expect(EVIDENCE_SCHEMA_VERSION).toBe("1.0");
  });

  it("exposes closed enumerations", () => {
    expect(EVIDENCE_SOURCES).toEqual(["client", "server", "mail", "build"]);
    expect(EVIDENCE_OUTCOMES).toEqual(["accepted", "completed", "rejected", "failed"]);
    expect(EVIDENCE_EVENT_NAMES).toEqual([
      "vault_story_requested",
      "vault_story_completed",
      "vault_story_rejected",
      "auth_header_rejected",
      "client_error_classified",
      "mail_send_accepted",
      "mail_delivery_recorded",
    ]);
  });

  it("allows exactly the nine specified attributes", () => {
    expect([...ALLOWED_ATTRIBUTE_KEYS].sort()).toEqual(
      [
        "routeTemplate",
        "httpStatus",
        "durationMs",
        "templateKey",
        "templateRevisionHash",
        "providerMessageId",
        "providerEventId",
        "providerEventType",
        "errorCategory",
      ].sort(),
    );
    expect(MAX_ATTRIBUTE_STRING_LENGTH).toBe(128);
  });
});

describe("assertEvidenceAttributes — accepted shapes", () => {
  it("accepts all nine attributes in their primitive formats", () => {
    const attributes = validAttributes();
    expect(() => assertEvidenceAttributes(attributes)).not.toThrow();
  });

  it("accepts an empty attribute object", () => {
    expect(() => assertEvidenceAttributes({})).not.toThrow();
  });

  it("accepts any subset of the allowed attributes", () => {
    expect(() => assertEvidenceAttributes({ durationMs: 0 })).not.toThrow();
    expect(() => assertEvidenceAttributes({ templateKey: "event-invite" })).not.toThrow();
    expect(() => assertEvidenceAttributes({ errorCategory: "unknown" })).not.toThrow();
  });

  it("accepts a string of exactly the maximum length", () => {
    expect(() =>
      assertEvidenceAttributes({ providerMessageId: "x".repeat(MAX_ATTRIBUTE_STRING_LENGTH) }),
    ).not.toThrow();
  });

  it("accepts every closed provider event type and error category", () => {
    for (const providerEventType of ["delivered", "bounced", "deferred", "failed"]) {
      expect(() => assertEvidenceAttributes({ providerEventType })).not.toThrow();
    }
    for (const errorCategory of [
      "configuration",
      "validation",
      "authentication",
      "rate_limit",
      "upstream",
      "unknown",
    ]) {
      expect(() => assertEvidenceAttributes({ errorCategory })).not.toThrow();
    }
  });
});

describe("assertEvidenceAttributes — rejected keys", () => {
  it.each(FORBIDDEN_KEYS)("rejects the forbidden key %s", (key) => {
    expect(() => assertEvidenceAttributes({ [key]: "value" })).toThrow(
      new RegExp(`unknown attribute.*${key}`, "i"),
    );
  });

  it("rejects a forbidden key even when every other attribute is valid", () => {
    expect(() => assertEvidenceAttributes({ ...validAttributes(), email: "a@b.c" })).toThrow(
      /unknown attribute/i,
    );
  });

  it("rejects unknown keys regardless of casing or prefix tricks", () => {
    expect(() => assertEvidenceAttributes({ RouteTemplate: "/x" })).toThrow(/unknown attribute/i);
    expect(() => assertEvidenceAttributes({ durationMS: 1 })).toThrow(/unknown attribute/i);
    expect(() => assertEvidenceAttributes({ __proto__x: 1 })).toThrow(/unknown attribute/i);
  });

  it("does not silently drop unknown keys", () => {
    const attributes = { durationMs: 1, message: "boom" };
    expect(() => assertEvidenceAttributes(attributes)).toThrow();
    // The input is not mutated — there is no masking or stripping.
    expect(attributes).toEqual({ durationMs: 1, message: "boom" });
  });
});

describe("assertEvidenceAttributes — rejected value types", () => {
  it("rejects arrays", () => {
    expect(() => assertEvidenceAttributes({ templateKey: ["a"] })).toThrow(/templateKey/);
  });

  it("rejects plain objects", () => {
    expect(() => assertEvidenceAttributes({ providerMessageId: { id: "x" } })).toThrow(
      /providerMessageId/,
    );
  });

  it("rejects functions", () => {
    expect(() => assertEvidenceAttributes({ routeTemplate: () => "/x" })).toThrow(/routeTemplate/);
  });

  it("rejects Error instances", () => {
    expect(() => assertEvidenceAttributes({ errorCategory: new Error("x") })).toThrow(
      /errorCategory/,
    );
  });

  it("rejects Request, Response and Headers instances", () => {
    expect(() =>
      assertEvidenceAttributes({ routeTemplate: new Request("https://example.invalid/") }),
    ).toThrow(/routeTemplate/);
    expect(() => assertEvidenceAttributes({ routeTemplate: new Response("x") })).toThrow(
      /routeTemplate/,
    );
    expect(() => assertEvidenceAttributes({ routeTemplate: new Headers() })).toThrow(
      /routeTemplate/,
    );
  });

  it("rejects strings longer than the maximum", () => {
    expect(() =>
      assertEvidenceAttributes({
        providerEventId: "x".repeat(MAX_ATTRIBUTE_STRING_LENGTH + 1),
      }),
    ).toThrow(/providerEventId.*128/);
  });

  it("rejects empty strings", () => {
    expect(() => assertEvidenceAttributes({ templateKey: "" })).toThrow(/templateKey/);
  });

  it("rejects numbers where strings are expected and vice versa", () => {
    expect(() => assertEvidenceAttributes({ templateKey: 42 })).toThrow(/templateKey/);
    expect(() => assertEvidenceAttributes({ durationMs: "42" })).toThrow(/durationMs/);
    expect(() => assertEvidenceAttributes({ httpStatus: "200" })).toThrow(/httpStatus/);
  });

  it("rejects non-finite, negative or fractional numbers", () => {
    expect(() => assertEvidenceAttributes({ durationMs: Number.NaN })).toThrow(/durationMs/);
    expect(() => assertEvidenceAttributes({ durationMs: Number.POSITIVE_INFINITY })).toThrow(
      /durationMs/,
    );
    expect(() => assertEvidenceAttributes({ durationMs: -1 })).toThrow(/durationMs/);
    expect(() => assertEvidenceAttributes({ durationMs: 1.5 })).toThrow(/durationMs/);
  });

  it("rejects HTTP statuses outside 100–599", () => {
    expect(() => assertEvidenceAttributes({ httpStatus: 99 })).toThrow(/httpStatus/);
    expect(() => assertEvidenceAttributes({ httpStatus: 600 })).toThrow(/httpStatus/);
  });

  it("rejects values outside the closed enumerations", () => {
    expect(() => assertEvidenceAttributes({ providerEventType: "opened" })).toThrow(
      /providerEventType/,
    );
    expect(() => assertEvidenceAttributes({ errorCategory: "database" })).toThrow(/errorCategory/);
  });

  it("rejects null, undefined, booleans, bigint and symbols as values", () => {
    expect(() => assertEvidenceAttributes({ durationMs: null })).toThrow(/durationMs/);
    expect(() => assertEvidenceAttributes({ durationMs: undefined })).toThrow(/durationMs/);
    expect(() => assertEvidenceAttributes({ templateKey: true })).toThrow(/templateKey/);
    expect(() => assertEvidenceAttributes({ durationMs: 10n })).toThrow(/durationMs/);
    expect(() => assertEvidenceAttributes({ templateKey: Symbol("x") })).toThrow(/templateKey/);
  });

  it("rejects a non-object attribute container", () => {
    expect(() => assertEvidenceAttributes(null as unknown as Record<string, unknown>)).toThrow();
    expect(() => assertEvidenceAttributes([] as unknown as Record<string, unknown>)).toThrow();
    expect(() => assertEvidenceAttributes("x" as unknown as Record<string, unknown>)).toThrow();
  });
});

describe("createCorrelationId", () => {
  it("returns an RFC 4122 UUID", () => {
    expect(createCorrelationId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("is random per call", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createCorrelationId()));
    expect(ids.size).toBe(50);
  });
});

describe("createEvidenceEvent", () => {
  it("builds a complete, frozen V1 event with a UTC timestamp", () => {
    const event = createEvidenceEvent({
      correlationId: CORRELATION_ID,
      source: "server",
      eventName: "vault_story_requested",
      outcome: "accepted",
      attributes: {},
      occurredAt: FIXED_NOW,
    });

    expect(event).toEqual({
      schemaVersion: "1.0",
      occurredAt: "2026-09-07T15:00:00.000Z",
      correlationId: CORRELATION_ID,
      source: "server",
      eventName: "vault_story_requested",
      outcome: "accepted",
      attributes: {},
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.attributes)).toBe(true);
  });

  it("defaults occurredAt to now, in UTC", () => {
    const before = Date.now();
    const event = createEvidenceEvent({
      correlationId: CORRELATION_ID,
      source: "client",
      eventName: "client_error_classified",
      outcome: "rejected",
      attributes: { errorCategory: "validation" },
    });
    const after = Date.now();

    expect(event.occurredAt.endsWith("Z")).toBe(true);
    const parsed = Date.parse(event.occurredAt);
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });

  it("copies attributes so later mutation of the input cannot leak into the event", () => {
    const attributes: Record<string, unknown> = { durationMs: 5 };
    const event = createEvidenceEvent({
      correlationId: CORRELATION_ID,
      source: "server",
      eventName: "vault_story_completed",
      outcome: "completed",
      attributes: attributes as EvidenceAttributes,
      occurredAt: FIXED_NOW,
    });
    attributes["message"] = "late injection";
    expect(event.attributes).toEqual({ durationMs: 5 });
  });

  it("carries exactly the seven top-level fields", () => {
    const event = createEvidenceEvent({
      correlationId: CORRELATION_ID,
      source: "mail",
      eventName: "mail_send_accepted",
      outcome: "accepted",
      attributes: { templateKey: "family-welcome", providerMessageId: "msg_1" },
      occurredAt: FIXED_NOW,
    });
    expect(Object.keys(event).sort()).toEqual(
      [
        "schemaVersion",
        "occurredAt",
        "correlationId",
        "source",
        "eventName",
        "outcome",
        "attributes",
      ].sort(),
    );
  });

  it("rejects an invalid Date for occurredAt", () => {
    expect(() =>
      createEvidenceEvent({
        correlationId: CORRELATION_ID,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "accepted",
        attributes: {},
        occurredAt: new Date("garbage"),
      }),
    ).toThrow(/invalid date/i);
  });

  it("rejects a non-UTC/non-Date occurredAt (strings with offsets are not accepted)", () => {
    expect(() =>
      createEvidenceEvent({
        correlationId: CORRELATION_ID,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "accepted",
        attributes: {},
        occurredAt: "2026-09-07T17:00:00.000+02:00" as unknown as Date,
      }),
    ).toThrow(/Date instance/i);
  });

  it.each([
    ["empty", ""],
    ["a user id look-alike", "user_12345"],
    ["a database id", "42"],
    ["a session token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc"],
    ["an e-mail address", "someone@example.com"],
    ["a UUID without version nibble", "0f5a3d1e-7c2b-0e8a-9d6f-1a2b3c4d5e6f"],
    ["a UUID with braces", "{0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f}"],
    ["a UUID with surrounding whitespace", " 0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f "],
  ])("rejects a correlationId that is %s", (_label, correlationId) => {
    expect(() =>
      createEvidenceEvent({
        correlationId,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "accepted",
        attributes: {},
        occurredAt: FIXED_NOW,
      }),
    ).toThrow(/correlationId/);
  });

  it("rejects values outside the closed enumerations for source, eventName and outcome", () => {
    const base = {
      correlationId: CORRELATION_ID,
      attributes: {},
      occurredAt: FIXED_NOW,
    };
    expect(() =>
      createEvidenceEvent({
        ...base,
        source: "browser" as never,
        eventName: "vault_story_requested",
        outcome: "accepted",
      }),
    ).toThrow(/source/);
    expect(() =>
      createEvidenceEvent({
        ...base,
        source: "server",
        eventName: "user_logged_in" as never,
        outcome: "accepted",
      }),
    ).toThrow(/eventName/);
    expect(() =>
      createEvidenceEvent({
        ...base,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "ok" as never,
      }),
    ).toThrow(/outcome/);
  });

  it("rejects forbidden attributes through the same validator", () => {
    expect(() =>
      createEvidenceEvent({
        correlationId: CORRELATION_ID,
        source: "server",
        eventName: "vault_story_rejected",
        outcome: "rejected",
        attributes: { errorCategory: "validation", message: "sealed" } as never,
        occurredAt: FIXED_NOW,
      }),
    ).toThrow(/unknown attribute/i);
  });

  it("serialises to JSON without any forbidden key", () => {
    const event = createEvidenceEvent({
      correlationId: CORRELATION_ID,
      source: "server",
      eventName: "vault_story_rejected",
      outcome: "rejected",
      attributes: { errorCategory: "validation", httpStatus: 409 },
      occurredAt: FIXED_NOW,
    });
    const json = JSON.stringify(event);
    for (const key of FORBIDDEN_KEYS) {
      expect(json).not.toMatch(new RegExp(`"${key}"`));
    }
  });
});
