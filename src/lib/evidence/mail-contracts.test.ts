import { describe, expect, it } from "vitest";

import {
  MAIL_DELIVERY_STAGES,
  MAIL_EVIDENCE_STAGES,
  createMailAcceptedRecord,
  createMailDeliveryRecord,
  createMailIntentRecord,
} from "./mail-contracts";

const CORRELATION_ID = "0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f";
const HASH = "3b8a1f0c9d2e4b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b";
const NOW = new Date("2026-09-07T15:00:00.000Z");
const RECORD_KEYS = [
  "schemaVersion",
  "occurredAt",
  "correlationId",
  "stage",
  "templateKey",
  "templateRevisionHash",
];

/** Mail-specific data that must never appear in a record. */
const FORBIDDEN = {
  recipient: "emma@example.com",
  to: "emma@example.com",
  name: "Emma Jensen",
  subject: "Welcome to the Jensen family archive",
  html: "<p>Hi Emma</p>",
  text: "Hi Emma",
  templateData: { memberName: "Emma" },
  confirmationUrl: "https://app.example/confirm?token=abc",
  token: "abc123",
  from: "noreply@notify.example",
  ip: "203.0.113.7",
  rawPayload: '{"event":"delivered"}',
  signature: "sha256=deadbeef",
  runId: "run_123",
  workflowId: "wf_123",
} as const;

describe("mail evidence constants", () => {
  it("exposes the closed stage lists", () => {
    expect(MAIL_EVIDENCE_STAGES).toEqual([
      "intent",
      "accepted",
      "delivered",
      "bounced",
      "deferred",
      "failed",
    ]);
    expect(MAIL_DELIVERY_STAGES).toEqual(["delivered", "bounced", "deferred", "failed"]);
  });
});

describe("createMailIntentRecord", () => {
  it("builds a frozen intent record with UTC, template key and release hash", () => {
    const record = createMailIntentRecord({
      correlationId: CORRELATION_ID,
      templateKey: "family-welcome",
      templateRevisionHash: HASH,
      occurredAt: NOW,
    });
    expect(record).toEqual({
      schemaVersion: "1.0",
      occurredAt: "2026-09-07T15:00:00.000Z",
      correlationId: CORRELATION_ID,
      stage: "intent",
      templateKey: "family-welcome",
      templateRevisionHash: HASH,
    });
    expect(Object.keys(record).sort()).toEqual([...RECORD_KEYS].sort());
    expect(Object.isFrozen(record)).toBe(true);
  });

  it("defaults occurredAt to now in UTC", () => {
    const record = createMailIntentRecord({
      correlationId: CORRELATION_ID,
      templateKey: "event-invite",
      templateRevisionHash: HASH,
    });
    expect(record.occurredAt.endsWith("Z")).toBe(true);
    expect(Math.abs(Date.parse(record.occurredAt) - Date.now())).toBeLessThan(5_000);
  });

  it("accepts every known template key", () => {
    for (const templateKey of [
      "family-welcome",
      "event-invite",
      "signup",
      "invite",
      "magic-link",
      "recovery",
      "email-change",
      "reauthentication",
    ]) {
      expect(() =>
        createMailIntentRecord({
          correlationId: CORRELATION_ID,
          templateKey,
          templateRevisionHash: HASH,
        }),
      ).not.toThrow();
    }
  });

  it.each([
    ["an empty key", ""],
    ["a key with spaces", "family welcome"],
    ["a key with uppercase", "FamilyWelcome"],
    ["a path", "../templates/family-welcome"],
    ["an over-long key", "a".repeat(65)],
  ])("rejects %s as templateKey", (_label, templateKey) => {
    expect(() =>
      createMailIntentRecord({
        correlationId: CORRELATION_ID,
        templateKey,
        templateRevisionHash: HASH,
      }),
    ).toThrow(/templateKey/);
  });

  it.each([
    ["an empty hash", ""],
    ["a short hash", "abc123"],
    ["an uppercase hash", HASH.toUpperCase()],
    ["a non-hex hash", "g".repeat(64)],
    ["a rendered-mail lookalike", "<p>Hi Emma</p>"],
  ])("rejects %s as templateRevisionHash", (_label, templateRevisionHash) => {
    expect(() =>
      createMailIntentRecord({
        correlationId: CORRELATION_ID,
        templateKey: "family-welcome",
        templateRevisionHash,
      }),
    ).toThrow(/templateRevisionHash/);
  });

  it("rejects a non-opaque correlation", () => {
    for (const correlationId of ["", "emma@example.com", "msg_123", "42"]) {
      expect(() =>
        createMailIntentRecord({
          correlationId,
          templateKey: "family-welcome",
          templateRevisionHash: HASH,
        }),
      ).toThrow(/correlationId/);
    }
  });

  it("rejects an invalid Date", () => {
    expect(() =>
      createMailIntentRecord({
        correlationId: CORRELATION_ID,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        occurredAt: new Date("nope"),
      }),
    ).toThrow(/invalid date/i);
  });

  it.each(Object.entries(FORBIDDEN))("rejects the forbidden field %s", (key, value) => {
    expect(() =>
      createMailIntentRecord({
        correlationId: CORRELATION_ID,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        [key]: value,
      } as never),
    ).toThrow(new RegExp(`unknown field.*${key}`, "i"));
  });
});

describe("createMailAcceptedRecord", () => {
  it("requires a real provider message id and records it", () => {
    const record = createMailAcceptedRecord({
      correlationId: CORRELATION_ID,
      templateKey: "family-welcome",
      templateRevisionHash: HASH,
      providerMessageId: "msg_01J8ZK3Q9X7",
      occurredAt: NOW,
    });
    expect(record.stage).toBe("accepted");
    expect(record.providerMessageId).toBe("msg_01J8ZK3Q9X7");
    expect(Object.keys(record).sort()).toEqual([...RECORD_KEYS, "providerMessageId"].sort());
    expect(Object.isFrozen(record)).toBe(true);
  });

  it.each([
    ["an empty id", ""],
    ["whitespace", "   "],
    ["a locally invented placeholder", "local-0f5a3d1e"],
    ["the literal 'unknown'", "unknown"],
    ["a UUID we generated ourselves", CORRELATION_ID],
    ["an over-long id", "m".repeat(129)],
    ["an e-mail address", "emma@example.com"],
  ])("rejects %s as providerMessageId", (_label, providerMessageId) => {
    expect(() =>
      createMailAcceptedRecord({
        correlationId: CORRELATION_ID,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        providerMessageId,
      }),
    ).toThrow(/providerMessageId/);
  });

  it("rejects a missing providerMessageId even when everything else is valid", () => {
    expect(() =>
      createMailAcceptedRecord({
        correlationId: CORRELATION_ID,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
      } as never),
    ).toThrow(/providerMessageId/);
  });

  it.each(Object.entries(FORBIDDEN))("rejects the forbidden field %s", (key, value) => {
    expect(() =>
      createMailAcceptedRecord({
        correlationId: CORRELATION_ID,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        providerMessageId: "msg_1",
        [key]: value,
      } as never),
    ).toThrow(/unknown field/i);
  });
});

describe("createMailDeliveryRecord", () => {
  const base = {
    correlationId: CORRELATION_ID,
    templateKey: "event-invite",
    templateRevisionHash: HASH,
    providerMessageId: "msg_01J8ZK3Q9X7",
    providerEventId: "evt_01J8ZK3QAB1",
    occurredAt: NOW,
  };

  it("records each of the four delivery stages with message and event id", () => {
    for (const stage of ["delivered", "bounced", "deferred", "failed"] as const) {
      const record = createMailDeliveryRecord({ ...base, stage });
      expect(record.stage).toBe(stage);
      expect(record.providerEventId).toBe("evt_01J8ZK3QAB1");
      expect(Object.keys(record).sort()).toEqual(
        [...RECORD_KEYS, "providerMessageId", "providerEventId"].sort(),
      );
      expect(Object.isFrozen(record)).toBe(true);
    }
  });

  it("rejects intent/accepted and unknown stages", () => {
    for (const stage of ["intent", "accepted", "opened", "clicked", "sent", ""]) {
      expect(() => createMailDeliveryRecord({ ...base, stage: stage as never })).toThrow(/stage/);
    }
  });

  it("requires a real provider event id", () => {
    for (const providerEventId of ["", "unknown", "local-1", CORRELATION_ID]) {
      expect(() =>
        createMailDeliveryRecord({ ...base, stage: "delivered", providerEventId }),
      ).toThrow(/providerEventId/);
    }
  });

  it.each(Object.entries(FORBIDDEN))("rejects the forbidden field %s", (key, value) => {
    expect(() =>
      createMailDeliveryRecord({ ...base, stage: "delivered", [key]: value } as never),
    ).toThrow(/unknown field/i);
  });

  it("serialises without any forbidden key or value", () => {
    const record = createMailDeliveryRecord({ ...base, stage: "delivered" });
    const json = JSON.stringify(record);
    for (const [key, value] of Object.entries(FORBIDDEN)) {
      expect(json).not.toContain(`"${key}"`);
      if (typeof value === "string") expect(json).not.toContain(value);
    }
  });
});
