/**
 * Server-side evidence seam.
 *
 * `EvidenceTransport` is the only way an evidence event can leave the process, and the
 * only transport that exists is `NoopEvidenceTransport`: it accepts the event and drops
 * it. The seam therefore produces no logs, no network traffic and no storage until a
 * real transport is added behind its own release gate. It reads no environment
 * variable — a transport is chosen by explicit injection, never by configuration.
 *
 * `createServerEvidenceEmitter` offers the few server events the specification allows.
 * Each method accepts only what the event may carry (an opaque correlation, a duration,
 * a closed error category, an HTTP status) and builds the event through
 * `createEvidenceEvent`, so the allowlist in contracts.ts is enforced on every call.
 * Callers pass no entry ids, titles, contents, transcripts, recipients, names, models,
 * URLs, keys, header values or error messages — the signatures make that impossible.
 */

import { createEvidenceEvent, type EvidenceEventV1, type SafeErrorCategory } from "./contracts";
import { isUtcIsoString } from "./utc";

export interface EvidenceTransport {
  emit(event: EvidenceEventV1): Promise<void>;
}

/** Production default: accepts and discards. */
export class NoopEvidenceTransport implements EvidenceTransport {
  async emit(_event: EvidenceEventV1): Promise<void> {
    return;
  }
}

/**
 * Re-validates a pre-built event (attributes and UTC) and hands it to the transport.
 * Building through `createEvidenceEvent` already validates; this guards events that
 * were constructed elsewhere.
 */
export async function emitEvidence(
  transport: EvidenceTransport,
  event: EvidenceEventV1,
): Promise<void> {
  if (!isUtcIsoString(event.occurredAt)) {
    throw new TypeError("occurredAt must be an RFC 3339 UTC timestamp");
  }
  const validated = createEvidenceEvent({
    correlationId: event.correlationId,
    source: event.source,
    eventName: event.eventName,
    outcome: event.outcome,
    attributes: event.attributes,
    occurredAt: new Date(event.occurredAt),
  });
  await transport.emit(validated);
}

export type ServerEvidenceEmitter = Readonly<{
  vaultStoryRequested(correlationId: string): Promise<void>;
  vaultStoryCompleted(correlationId: string, durationMs: number): Promise<void>;
  vaultStoryRejected(
    correlationId: string,
    category: SafeErrorCategory,
    httpStatus?: number,
  ): Promise<void>;
  authHeaderRejected(correlationId: string, category: SafeErrorCategory): Promise<void>;
}>;

export function createServerEvidenceEmitter(
  transport: EvidenceTransport = new NoopEvidenceTransport(),
): ServerEvidenceEmitter {
  // async so that a validation failure surfaces as a rejected promise, never as a
  // synchronous throw in the middle of a product handler.
  const send = async (
    correlationId: string,
    eventName: EvidenceEventV1["eventName"],
    outcome: EvidenceEventV1["outcome"],
    attributes: EvidenceEventV1["attributes"],
  ): Promise<void> => {
    const event = createEvidenceEvent({
      correlationId,
      source: "server",
      eventName,
      outcome,
      attributes,
    });
    await transport.emit(event);
  };

  return Object.freeze({
    vaultStoryRequested: (correlationId) =>
      send(correlationId, "vault_story_requested", "accepted", {}),

    vaultStoryCompleted: (correlationId, durationMs) =>
      send(correlationId, "vault_story_completed", "completed", {
        durationMs: Math.max(0, Math.round(durationMs)),
      }),

    vaultStoryRejected: (correlationId, category, httpStatus) =>
      send(
        correlationId,
        "vault_story_rejected",
        "rejected",
        httpStatus === undefined
          ? { errorCategory: category }
          : { errorCategory: category, httpStatus },
      ),

    authHeaderRejected: (correlationId, category) =>
      send(correlationId, "auth_header_rejected", "rejected", { errorCategory: category }),
  });
}

/**
 * Process-wide emitter for product code. Bound to the no-op transport; swapping it for
 * a real transport is a deliberate code change behind its own gate, not a setting.
 */
export const serverEvidence: ServerEvidenceEmitter = createServerEvidenceEmitter();

/**
 * Fire-and-forget wrapper for product paths: evidence must never turn a successful
 * product operation into a failure. Rejections are swallowed here on purpose — the
 * no-op transport cannot fail, and a future transport's failures are its own concern.
 */
export function recordEvidence(emission: Promise<void>): void {
  void emission.catch(() => undefined);
}
