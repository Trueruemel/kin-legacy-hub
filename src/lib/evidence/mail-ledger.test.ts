import { describe, expect, it } from "vitest";

import { InMemoryMailLedger } from "./mail-ledger";
import {
  createMailAcceptedRecord,
  createMailDeliveryRecord,
  createMailIntentRecord,
} from "./mail-contracts";

const C1 = "0f5a3d1e-7c2b-4e8a-9d6f-1a2b3c4d5e6f";
const C2 = "8d1c2b3a-4f5e-4a6b-8c7d-9e0f1a2b3c4d";
const HASH = "3b8a1f0c9d2e4b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b";
const T = (s: string) => new Date(s);

function chain(ledger: InMemoryMailLedger, correlationId: string, templateKey: string) {
  ledger.append(
    createMailIntentRecord({
      correlationId,
      templateKey,
      templateRevisionHash: HASH,
      occurredAt: T("2026-09-07T15:00:00.000Z"),
    }),
  );
  ledger.append(
    createMailAcceptedRecord({
      correlationId,
      templateKey,
      templateRevisionHash: HASH,
      providerMessageId: `msg_${correlationId.slice(0, 8)}`,
      occurredAt: T("2026-09-07T15:00:01.000Z"),
    }),
  );
}

describe("InMemoryMailLedger", () => {
  it("starts empty and appends validated records in order", () => {
    const ledger = new InMemoryMailLedger();
    expect(ledger.all()).toEqual([]);
    chain(ledger, C1, "family-welcome");
    expect(ledger.all().map((r) => r.stage)).toEqual(["intent", "accepted"]);
  });

  it("returns copies so callers cannot mutate the ledger", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    const snapshot = ledger.all();
    (snapshot as unknown[]).pop();
    expect(ledger.all()).toHaveLength(2);
    expect(Object.isFrozen(ledger.all()[0])).toBe(true);
  });

  it("groups a chain by correlation", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    chain(ledger, C2, "event-invite");
    expect(ledger.chain(C1).map((r) => r.templateKey)).toEqual([
      "family-welcome",
      "family-welcome",
    ]);
    expect(ledger.chain(C2)).toHaveLength(2);
    expect(ledger.chain("00000000-0000-4000-8000-000000000000")).toEqual([]);
  });

  it("reports a chain as proven only with intent, accepted and a terminal delivery stage", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    expect(ledger.isProven(C1)).toBe(false);

    ledger.append(
      createMailDeliveryRecord({
        correlationId: C1,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        providerMessageId: "msg_0f5a3d1e",
        providerEventId: "evt_1",
        stage: "deferred",
        occurredAt: T("2026-09-07T15:00:05.000Z"),
      }),
    );
    expect(ledger.isProven(C1)).toBe(false); // deferred is not terminal

    ledger.append(
      createMailDeliveryRecord({
        correlationId: C1,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        providerMessageId: "msg_0f5a3d1e",
        providerEventId: "evt_2",
        stage: "delivered",
        occurredAt: T("2026-09-07T15:00:09.000Z"),
      }),
    );
    expect(ledger.isProven(C1)).toBe(true);
  });

  it("does not treat 'accepted' or 'sent' as delivery", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    expect(ledger.isProven(C1)).toBe(false);
  });

  it("refuses a delivery record whose message id does not match the accepted record", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    expect(() =>
      ledger.append(
        createMailDeliveryRecord({
          correlationId: C1,
          templateKey: "family-welcome",
          templateRevisionHash: HASH,
          providerMessageId: "msg_someone_else",
          providerEventId: "evt_9",
          stage: "delivered",
        }),
      ),
    ).toThrow(/providerMessageId/);
  });

  it("refuses a delivery record before an accepted record exists", () => {
    const ledger = new InMemoryMailLedger();
    expect(() =>
      ledger.append(
        createMailDeliveryRecord({
          correlationId: C1,
          templateKey: "family-welcome",
          templateRevisionHash: HASH,
          providerMessageId: "msg_x",
          providerEventId: "evt_1",
          stage: "delivered",
        }),
      ),
    ).toThrow(/accepted/);
  });

  it("refuses a second record with the same provider event id (deduplication)", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    const delivery = {
      correlationId: C1,
      templateKey: "family-welcome",
      templateRevisionHash: HASH,
      providerMessageId: "msg_0f5a3d1e",
      providerEventId: "evt_dup",
      stage: "delivered" as const,
    };
    ledger.append(createMailDeliveryRecord(delivery));
    expect(() => ledger.append(createMailDeliveryRecord(delivery))).toThrow(/providerEventId/);
  });

  it("refuses a record whose template key or hash drifts within a chain", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    expect(() =>
      ledger.append(
        createMailDeliveryRecord({
          correlationId: C1,
          templateKey: "event-invite",
          templateRevisionHash: HASH,
          providerMessageId: "msg_0f5a3d1e",
          providerEventId: "evt_3",
          stage: "delivered",
        }),
      ),
    ).toThrow(/templateKey/);
  });

  it("rejects anything that is not a frozen record from the contract factories", () => {
    const ledger = new InMemoryMailLedger();
    expect(() =>
      ledger.append({
        schemaVersion: "1.0",
        occurredAt: "2026-09-07T15:00:00.000Z",
        correlationId: C1,
        stage: "intent",
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        recipient: "emma@example.com",
      } as never),
    ).toThrow(/unknown field/i);
  });

  it("counts proven chains per template key", () => {
    const ledger = new InMemoryMailLedger();
    chain(ledger, C1, "family-welcome");
    ledger.append(
      createMailDeliveryRecord({
        correlationId: C1,
        templateKey: "family-welcome",
        templateRevisionHash: HASH,
        providerMessageId: "msg_0f5a3d1e",
        providerEventId: "evt_1",
        stage: "delivered",
      }),
    );
    chain(ledger, C2, "event-invite");
    expect(ledger.provenByTemplate()).toEqual({ "family-welcome": 1 });
  });
});
