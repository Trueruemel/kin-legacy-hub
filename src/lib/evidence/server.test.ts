import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { EVIDENCE_SCHEMA_VERSION, createCorrelationId, type EvidenceEventV1 } from "./contracts";
import {
  NoopEvidenceTransport,
  createServerEvidenceEmitter,
  emitEvidence,
  type EvidenceTransport,
} from "./server";

/** Collects events instead of sending them anywhere. Test-only. */
class InMemoryTransport implements EvidenceTransport {
  readonly events: EvidenceEventV1[] = [];
  async emit(event: EvidenceEventV1): Promise<void> {
    this.events.push(event);
  }
}

class ExplodingTransport implements EvidenceTransport {
  async emit(): Promise<void> {
    throw new Error("transport down — must never reach the product path");
  }
}

/** Anything that must never show up in a serialised server event. */
const FORBIDDEN_FRAGMENTS = [
  // vault entry fields
  "vault-entry-77",
  "Grandma's letter",
  "Dear Emma",
  "transcript",
  "Emma",
  "Grandpa Karl",
  // AI call context
  "google/gemini",
  "ai.gateway.lovable.dev",
  "LOVABLE_API_KEY",
  "sk_live",
  // error context
  "row-level security",
  "at /home/",
  // auth header metadata
  "headerLength",
  "tokenLength",
  "tokenSegments",
  "hasCookie",
  "hasApiKeyHeader",
  "Bearer",
];

const CORRELATION_ID = "0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f";

function assertClean(event: EvidenceEventV1): void {
  const json = JSON.stringify(event);
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    expect(json).not.toContain(fragment);
  }
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
  expect(event.schemaVersion).toBe(EVIDENCE_SCHEMA_VERSION);
  expect(event.occurredAt.endsWith("Z")).toBe(true);
  expect(event.source).toBe("server");
  expect(Object.isFrozen(event)).toBe(true);
}

describe("NoopEvidenceTransport", () => {
  it("accepts an event and does nothing", async () => {
    const transport = new NoopEvidenceTransport();
    await expect(
      transport.emit({
        schemaVersion: "1.0",
        occurredAt: "2026-09-07T15:00:00.000Z",
        correlationId: CORRELATION_ID,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "accepted",
        attributes: {},
      }),
    ).resolves.toBeUndefined();
  });

  it("is the default transport of the server emitter", async () => {
    // No transport passed, no environment read, no error, no side effect.
    const emitter = createServerEvidenceEmitter();
    await expect(emitter.vaultStoryRequested(CORRELATION_ID)).resolves.toBeUndefined();
  });
});

describe("emitEvidence", () => {
  it("hands a validated event to the transport", async () => {
    const transport = new InMemoryTransport();
    await emitEvidence(transport, {
      schemaVersion: "1.0",
      occurredAt: "2026-09-07T15:00:00.000Z",
      correlationId: CORRELATION_ID,
      source: "server",
      eventName: "vault_story_requested",
      outcome: "accepted",
      attributes: {},
    });
    expect(transport.events).toHaveLength(1);
  });

  it("refuses an event with forbidden attributes before it reaches the transport", async () => {
    const transport = new InMemoryTransport();
    await expect(
      emitEvidence(transport, {
        schemaVersion: "1.0",
        occurredAt: "2026-09-07T15:00:00.000Z",
        correlationId: CORRELATION_ID,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "accepted",
        attributes: { title: "Grandma's letter" } as never,
      }),
    ).rejects.toThrow(/unknown attribute/i);
    expect(transport.events).toHaveLength(0);
  });

  it("refuses an event without a UTC timestamp", async () => {
    const transport = new InMemoryTransport();
    await expect(
      emitEvidence(transport, {
        schemaVersion: "1.0",
        occurredAt: "2026-09-07T17:00:00.000+02:00",
        correlationId: CORRELATION_ID,
        source: "server",
        eventName: "vault_story_requested",
        outcome: "accepted",
        attributes: {},
      }),
    ).rejects.toThrow(/occurredAt/);
    expect(transport.events).toHaveLength(0);
  });
});

describe("createServerEvidenceEmitter", () => {
  it("vaultStoryRequested carries only the correlation and nothing about the entry", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await emitter.vaultStoryRequested(CORRELATION_ID);

    expect(transport.events).toHaveLength(1);
    const event = transport.events[0]!;
    assertClean(event);
    expect(event).toMatchObject({
      correlationId: CORRELATION_ID,
      eventName: "vault_story_requested",
      outcome: "accepted",
      attributes: {},
    });
  });

  it("vaultStoryCompleted carries the correlation, UTC and a numeric duration only", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await emitter.vaultStoryCompleted(CORRELATION_ID, 842);

    const event = transport.events[0]!;
    assertClean(event);
    expect(event).toMatchObject({
      eventName: "vault_story_completed",
      outcome: "completed",
      attributes: { durationMs: 842 },
    });
    expect(Object.keys(event.attributes)).toEqual(["durationMs"]);
  });

  it("vaultStoryCompleted rounds fractional durations to whole milliseconds", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await emitter.vaultStoryCompleted(CORRELATION_ID, 12.7);
    expect(transport.events[0]!.attributes.durationMs).toBe(13);
  });

  it("vaultStoryRejected carries a closed error category and an optional status only", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await emitter.vaultStoryRejected(CORRELATION_ID, "validation");
    await emitter.vaultStoryRejected(CORRELATION_ID, "authentication", 403);

    expect(transport.events).toHaveLength(2);
    for (const event of transport.events) assertClean(event);
    expect(transport.events[0]).toMatchObject({
      eventName: "vault_story_rejected",
      outcome: "rejected",
      attributes: { errorCategory: "validation" },
    });
    expect(Object.keys(transport.events[0]!.attributes)).toEqual(["errorCategory"]);
    expect(transport.events[1]!.attributes).toEqual({
      errorCategory: "authentication",
      httpStatus: 403,
    });
  });

  it("vaultStoryRejected refuses a category outside the closed list", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await expect(
      emitter.vaultStoryRejected(CORRELATION_ID, "This item is still sealed." as never),
    ).rejects.toThrow(/errorCategory/);
    expect(transport.events).toHaveLength(0);
  });

  it("authHeaderRejected carries the closed category and no header metadata at all", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await emitter.authHeaderRejected(CORRELATION_ID, "authentication");

    const event = transport.events[0]!;
    assertClean(event);
    expect(event).toMatchObject({
      eventName: "auth_header_rejected",
      outcome: "rejected",
      attributes: { errorCategory: "authentication" },
    });
    expect(Object.keys(event.attributes)).toEqual(["errorCategory"]);
  });

  it("refuses a correlation that is not an opaque UUID", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    await expect(emitter.vaultStoryRequested("vault-entry-77")).rejects.toThrow(/correlationId/);
    await expect(emitter.vaultStoryRequested("user_42")).rejects.toThrow(/correlationId/);
    expect(transport.events).toHaveLength(0);
  });

  it("uses a fresh UTC timestamp per event", async () => {
    const transport = new InMemoryTransport();
    const emitter = createServerEvidenceEmitter(transport);
    const before = Date.now();
    await emitter.vaultStoryRequested(createCorrelationId());
    const after = Date.now();
    const ts = Date.parse(transport.events[0]!.occurredAt);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("propagates transport failures to the caller (the caller decides to swallow them)", async () => {
    const emitter = createServerEvidenceEmitter(new ExplodingTransport());
    await expect(emitter.vaultStoryRequested(CORRELATION_ID)).rejects.toThrow(/transport down/);
  });
});

describe("evidence modules stay isolated from the product's raw diagnostics", () => {
  const dir = join(__dirname);
  const sources = readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => [name, readFileSync(join(dir, name), "utf8")] as const);

  it("has at least the four contract modules", () => {
    expect(sources.map(([name]) => name).sort()).toEqual(
      expect.arrayContaining(["contracts.ts", "redact.ts", "server.ts", "utc.ts"]),
    );
  });

  it.each(sources)("%s imports nothing outside src/lib/evidence", (_name, source) => {
    const specifiers = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1] ?? "");
    // utc.ts has no imports at all; the others import only siblings.
    for (const specifier of specifiers) {
      expect(specifier.startsWith("./")).toBe(true);
    }
  });

  it.each(sources)("%s reads no environment and opens no network", (_name, source) => {
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest|WebSocket|EventSource/);
    expect(source).not.toMatch(/error-capture|describeError|consumeLastCapturedError/);
  });
});
