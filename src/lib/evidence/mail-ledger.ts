/**
 * In-memory mail evidence ledger — for unit tests and for reasoning about chains.
 *
 * It has no persistence and no network. A persistent ledger (database, retention,
 * deletion, RLS, rollback) is a separate release gate (Entscheidungsregister D-09).
 *
 * The ledger enforces the chain rules the contract alone cannot: a delivery event must
 * follow an accepted record with the same provider message id, provider event ids are
 * deduplicated, and template key/hash may not drift within one correlation.
 */

import {
  MAIL_DELIVERY_STAGES,
  assertMailEvidenceRecord,
  type MailEvidenceRecordV1,
} from "./mail-contracts";

/** Delivery stages that end a chain. "deferred" is transient and proves nothing yet. */
const TERMINAL_STAGES: ReadonlySet<string> = new Set(["delivered", "bounced", "failed"]);

export class InMemoryMailLedger {
  private readonly records: MailEvidenceRecordV1[] = [];
  private readonly seenEventIds = new Set<string>();

  append(record: MailEvidenceRecordV1): void {
    // Full re-validation: a hand-built frozen object with fake ids or a local timestamp
    // must never enter the ledger, whatever shape it pretends to have.
    assertMailEvidenceRecord(record);

    const chain = this.chain(record.correlationId);
    const first = chain[0];
    if (first) {
      if (first.templateKey !== record.templateKey) {
        throw new TypeError("templateKey must not change within a chain");
      }
      if (first.templateRevisionHash !== record.templateRevisionHash) {
        throw new TypeError("templateRevisionHash must not change within a chain");
      }
    }

    if ((MAIL_DELIVERY_STAGES as readonly string[]).includes(record.stage)) {
      const accepted = chain.find((r) => r.stage === "accepted");
      if (!accepted) {
        throw new TypeError("a delivery record requires a prior accepted record in the chain");
      }
      if (accepted.providerMessageId !== record.providerMessageId) {
        throw new TypeError(
          "providerMessageId of a delivery record must match the accepted record",
        );
      }
      const eventId = record.providerEventId ?? "";
      if (this.seenEventIds.has(eventId)) {
        throw new TypeError("providerEventId was already recorded (duplicate delivery event)");
      }
      this.seenEventIds.add(eventId);
    }

    this.records.push(record);
  }

  all(): readonly MailEvidenceRecordV1[] {
    return [...this.records];
  }

  chain(correlationId: string): readonly MailEvidenceRecordV1[] {
    return this.records.filter((r) => r.correlationId === correlationId);
  }

  /** intent + accepted + a terminal delivery stage, all on the same correlation. */
  isProven(correlationId: string): boolean {
    const chain = this.chain(correlationId);
    return (
      chain.some((r) => r.stage === "intent") &&
      chain.some((r) => r.stage === "accepted") &&
      chain.some((r) => TERMINAL_STAGES.has(r.stage))
    );
  }

  provenByTemplate(): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};
    const correlations = new Set(this.records.map((r) => r.correlationId));
    for (const correlationId of correlations) {
      if (!this.isProven(correlationId)) continue;
      const key = this.chain(correlationId)[0]?.templateKey ?? "";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }
}
