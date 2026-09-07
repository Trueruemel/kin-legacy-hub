/**
 * Mail evidence records, schema version 1.0.
 *
 * A mail is only *proven* delivered when three different stages are on record for the
 * same opaque correlation: the intent to send, the provider's acceptance (with the
 * provider's own message id) and a delivery/failure event (with the provider's own
 * event id). No stage substitutes for another; `sent: true` from an SDK is not delivery.
 *
 * A record carries the template key and a release-bound hash of the template *source* —
 * never the rendered mail, the recipient, the subject, a link, a token, the sender, an IP,
 * a webhook payload or its signature. Unknown fields are rejected, not stripped.
 *
 * Provider ids must come from the provider. Locally invented values ("unknown",
 * "local-…", our own correlation UUID) are refused so a chain cannot be faked.
 *
 * No dependencies beyond the sibling evidence modules; no environment, no I/O.
 */

import { toUtcIsoString } from "./utc";

export const MAIL_EVIDENCE_STAGES = [
  "intent",
  "accepted",
  "delivered",
  "bounced",
  "deferred",
  "failed",
] as const;
export type MailEvidenceStage = (typeof MAIL_EVIDENCE_STAGES)[number];

export const MAIL_DELIVERY_STAGES = ["delivered", "bounced", "deferred", "failed"] as const;
export type MailDeliveryStage = (typeof MAIL_DELIVERY_STAGES)[number];

export type MailEvidenceRecordV1 = Readonly<{
  schemaVersion: "1.0";
  occurredAt: string;
  correlationId: string;
  stage: MailEvidenceStage;
  templateKey: string;
  templateRevisionHash: string;
  providerMessageId?: string;
  providerEventId?: string;
}>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** kebab-case template keys as used by the registry and the auth webhook. */
const TEMPLATE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEMPLATE_KEY_MAX = 64;
/** SHA-256 hex of the template source at release time. */
const REVISION_HASH_PATTERN = /^[0-9a-f]{64}$/;
const PROVIDER_ID_MAX = 128;
/** Values that are clearly not provider-issued. */
const FAKE_PROVIDER_IDS: ReadonlySet<string> = new Set(["unknown", "none", "null", "n/a", "-"]);

const INTENT_FIELDS = new Set([
  "correlationId",
  "templateKey",
  "templateRevisionHash",
  "occurredAt",
]);
const ACCEPTED_FIELDS = new Set([...INTENT_FIELDS, "providerMessageId"]);
const DELIVERY_FIELDS = new Set([...ACCEPTED_FIELDS, "providerEventId", "stage"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function rejectUnknownFields(input: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !allowed.has(key)) {
      throw new TypeError(
        `Unknown field "${String(key)}" is not allowed in a mail evidence record`,
      );
    }
  }
}

function assertCorrelationId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TypeError("correlationId must be an opaque RFC 4122 UUID");
  }
}

function assertTemplateKey(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > TEMPLATE_KEY_MAX ||
    !TEMPLATE_KEY_PATTERN.test(value)
  ) {
    throw new TypeError("templateKey must be a kebab-case template identifier");
  }
}

function assertRevisionHash(value: unknown): asserts value is string {
  if (typeof value !== "string" || !REVISION_HASH_PATTERN.test(value)) {
    throw new TypeError("templateRevisionHash must be a lower-case SHA-256 hex digest");
  }
}

function assertProviderId(
  value: unknown,
  field: "providerMessageId" | "providerEventId",
): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${field} must be a provider-issued id`);
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > PROVIDER_ID_MAX ||
    trimmed !== value ||
    FAKE_PROVIDER_IDS.has(trimmed.toLowerCase()) ||
    trimmed.toLowerCase().startsWith("local") ||
    UUID_PATTERN.test(trimmed) ||
    trimmed.includes("@")
  ) {
    throw new TypeError(`${field} must be a provider-issued id, not a local or placeholder value`);
  }
}

function occurredAtOf(input: Record<string, unknown>): string {
  const value = input["occurredAt"];
  return toUtcIsoString(value === undefined ? new Date() : (value as Date));
}

function base(
  input: Record<string, unknown>,
  stage: MailEvidenceStage,
): Omit<MailEvidenceRecordV1, "providerMessageId" | "providerEventId"> {
  const { correlationId, templateKey, templateRevisionHash } = input;
  assertCorrelationId(correlationId);
  assertTemplateKey(templateKey);
  assertRevisionHash(templateRevisionHash);
  return {
    schemaVersion: "1.0",
    occurredAt: occurredAtOf(input),
    correlationId,
    stage,
    templateKey,
    templateRevisionHash,
  };
}

export function createMailIntentRecord(
  input: Readonly<{
    correlationId: string;
    templateKey: string;
    templateRevisionHash: string;
    occurredAt?: Date;
  }>,
): MailEvidenceRecordV1 {
  if (!isPlainObject(input)) throw new TypeError("input must be a plain object");
  rejectUnknownFields(input, INTENT_FIELDS);
  return Object.freeze(base(input, "intent"));
}

export function createMailAcceptedRecord(
  input: Readonly<{
    correlationId: string;
    templateKey: string;
    templateRevisionHash: string;
    providerMessageId: string;
    occurredAt?: Date;
  }>,
): MailEvidenceRecordV1 {
  if (!isPlainObject(input)) throw new TypeError("input must be a plain object");
  rejectUnknownFields(input, ACCEPTED_FIELDS);
  const record = base(input, "accepted");
  assertProviderId(input["providerMessageId"], "providerMessageId");
  return Object.freeze({ ...record, providerMessageId: input["providerMessageId"] });
}

export function createMailDeliveryRecord(
  input: Readonly<{
    correlationId: string;
    templateKey: string;
    templateRevisionHash: string;
    providerMessageId: string;
    providerEventId: string;
    stage: MailDeliveryStage;
    occurredAt?: Date;
  }>,
): MailEvidenceRecordV1 {
  if (!isPlainObject(input)) throw new TypeError("input must be a plain object");
  rejectUnknownFields(input, DELIVERY_FIELDS);
  const stage = input["stage"];
  if (typeof stage !== "string" || !(MAIL_DELIVERY_STAGES as readonly string[]).includes(stage)) {
    throw new TypeError(`stage must be one of ${MAIL_DELIVERY_STAGES.join(", ")}`);
  }
  const record = base(input, stage as MailDeliveryStage);
  assertProviderId(input["providerMessageId"], "providerMessageId");
  assertProviderId(input["providerEventId"], "providerEventId");
  return Object.freeze({
    ...record,
    providerMessageId: input["providerMessageId"],
    providerEventId: input["providerEventId"],
  });
}

/** True when a record was produced by one of the factories above (frozen, closed shape). */
export function isMailEvidenceRecord(value: unknown): value is MailEvidenceRecordV1 {
  if (!isPlainObject(value) || !Object.isFrozen(value)) return false;
  const stage = value["stage"];
  if (typeof stage !== "string" || !(MAIL_EVIDENCE_STAGES as readonly string[]).includes(stage)) {
    return false;
  }
  const allowed =
    stage === "intent" ? INTENT_FIELDS : stage === "accepted" ? ACCEPTED_FIELDS : DELIVERY_FIELDS;
  for (const key of Object.keys(value)) {
    if (key === "schemaVersion" || key === "occurredAt" || key === "stage") continue;
    if (!allowed.has(key)) return false;
  }
  return value["schemaVersion"] === "1.0";
}
