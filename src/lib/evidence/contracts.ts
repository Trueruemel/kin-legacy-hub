/**
 * Evidence event contract, schema version 1.0.
 *
 * This is the data-minimisation boundary for every future evidence trail (UTC proof,
 * mail delivery chain, observability). It is deliberately strict: an evidence event may
 * carry a handful of technical metadata and nothing else. Anything that could identify a
 * person, a family, a vault entry or a request — names, addresses, titles, content,
 * tokens, headers, bodies, URLs, IPs, database ids, stacks, messages — is rejected at
 * construction time. There is no masking and no automatic serialisation of unknown
 * values: unknown means rejected.
 *
 * The module is provider-neutral. It imports no SDK, reads no environment variable and
 * opens no connection. Transports (none exist yet) consume the frozen events it produces.
 */

import { toUtcIsoString } from "./utc";

export const EVIDENCE_SCHEMA_VERSION = "1.0" as const;

export const EVIDENCE_SOURCES = ["client", "server", "mail", "build"] as const;
export type EvidenceSource = (typeof EVIDENCE_SOURCES)[number];

export const EVIDENCE_OUTCOMES = ["accepted", "completed", "rejected", "failed"] as const;
export type EvidenceOutcome = (typeof EVIDENCE_OUTCOMES)[number];

export const EVIDENCE_EVENT_NAMES = [
  "vault_story_requested",
  "vault_story_completed",
  "vault_story_rejected",
  "auth_header_rejected",
  "client_error_classified",
  "mail_send_accepted",
  "mail_delivery_recorded",
] as const;
export type EvidenceEventName = (typeof EVIDENCE_EVENT_NAMES)[number];

export const SAFE_ERROR_CATEGORIES = [
  "configuration",
  "validation",
  "authentication",
  "rate_limit",
  "upstream",
  "unknown",
] as const;
export type SafeErrorCategory = (typeof SAFE_ERROR_CATEGORIES)[number];

export const PROVIDER_EVENT_TYPES = ["delivered", "bounced", "deferred", "failed"] as const;
export type ProviderEventType = (typeof PROVIDER_EVENT_TYPES)[number];

/** Longest string any attribute may carry. Long enough for ids, too short for content. */
export const MAX_ATTRIBUTE_STRING_LENGTH = 128;

export type EvidenceAttributes = Readonly<{
  routeTemplate?: string;
  httpStatus?: number;
  durationMs?: number;
  templateKey?: string;
  templateRevisionHash?: string;
  providerMessageId?: string;
  providerEventId?: string;
  providerEventType?: ProviderEventType;
  errorCategory?: SafeErrorCategory;
}>;

export type EvidenceEventV1 = Readonly<{
  schemaVersion: typeof EVIDENCE_SCHEMA_VERSION;
  occurredAt: string;
  correlationId: string;
  source: EvidenceSource;
  eventName: EvidenceEventName;
  outcome: EvidenceOutcome;
  attributes: EvidenceAttributes;
}>;

type AttributeRule =
  | { kind: "string" }
  | { kind: "count" }
  | { kind: "httpStatus" }
  | { kind: "enum"; values: readonly string[] };

/**
 * The allowlist. A key that is not in this table does not exist as far as evidence is
 * concerned — it is not stripped, not masked, not serialised; the whole event is refused.
 */
const ATTRIBUTE_RULES: Readonly<Record<keyof EvidenceAttributes, AttributeRule>> = Object.freeze({
  routeTemplate: { kind: "string" },
  httpStatus: { kind: "httpStatus" },
  durationMs: { kind: "count" },
  templateKey: { kind: "string" },
  templateRevisionHash: { kind: "string" },
  providerMessageId: { kind: "string" },
  providerEventId: { kind: "string" },
  providerEventType: { kind: "enum", values: PROVIDER_EVENT_TYPES },
  errorCategory: { kind: "enum", values: SAFE_ERROR_CATEGORIES },
});

export const ALLOWED_ATTRIBUTE_KEYS: readonly (keyof EvidenceAttributes)[] = Object.freeze(
  Object.keys(ATTRIBUTE_RULES) as (keyof EvidenceAttributes)[],
);

const ALLOWED_KEY_SET: ReadonlySet<string> = new Set(ALLOWED_ATTRIBUTE_KEYS);

/** RFC 4122 layout: version nibble 1–8, variant nibble 8–b. Nothing else is opaque enough. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isHttpStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= MAX_ATTRIBUTE_STRING_LENGTH
  );
}

function describeRule(rule: AttributeRule): string {
  switch (rule.kind) {
    case "string":
      return `a non-empty string of at most ${MAX_ATTRIBUTE_STRING_LENGTH} characters`;
    case "count":
      return "a non-negative integer";
    case "httpStatus":
      return "an integer HTTP status between 100 and 599";
    case "enum":
      return `one of ${rule.values.join(", ")}`;
  }
}

function satisfies(rule: AttributeRule, value: unknown): boolean {
  switch (rule.kind) {
    case "string":
      return isBoundedString(value);
    case "count":
      return isCount(value);
    case "httpStatus":
      return isHttpStatus(value);
    case "enum":
      return typeof value === "string" && rule.values.includes(value);
  }
}

/**
 * Validates an attribute bag against the allowlist. Throws on the first violation and
 * never modifies the input. Arrays, objects, functions, Error/Request/Response/Headers
 * instances and over-long strings are all rejected because none of them can be a
 * legitimate technical metadatum.
 */
export function assertEvidenceAttributes(
  attributes: Record<string, unknown>,
): asserts attributes is EvidenceAttributes {
  if (!isPlainObject(attributes)) {
    throw new TypeError("Evidence attributes must be a plain object");
  }
  // Reflect.ownKeys also surfaces symbol keys, which are never allowed.
  for (const key of Reflect.ownKeys(attributes)) {
    if (typeof key !== "string" || !ALLOWED_KEY_SET.has(key)) {
      throw new TypeError(`Unknown attribute "${String(key)}" is not allowed in evidence`);
    }
    const rule = ATTRIBUTE_RULES[key as keyof EvidenceAttributes];
    const value = attributes[key];
    if (!satisfies(rule, value)) {
      throw new TypeError(`Attribute "${key}" must be ${describeRule(rule)}`);
    }
  }
}

/** A fresh, random, opaque correlation id. Never derived from anything. */
export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export type CreateEvidenceEventInput = Omit<EvidenceEventV1, "schemaVersion" | "occurredAt"> & {
  occurredAt?: Date;
};

/**
 * Builds a frozen V1 event. Every field is validated; the attribute bag is copied so the
 * caller cannot mutate the event afterwards. `occurredAt` must be a valid `Date` (default:
 * now) and is always rendered as UTC.
 */
export function createEvidenceEvent(input: CreateEvidenceEventInput): EvidenceEventV1 {
  if (!isPlainObject(input)) {
    throw new TypeError("Evidence event input must be a plain object");
  }

  const { correlationId, source, eventName, outcome, attributes } = input;

  if (typeof correlationId !== "string" || !UUID_PATTERN.test(correlationId)) {
    throw new TypeError("correlationId must be an opaque RFC 4122 UUID");
  }
  if (!EVIDENCE_SOURCES.includes(source)) {
    throw new TypeError(`source must be one of ${EVIDENCE_SOURCES.join(", ")}`);
  }
  if (!EVIDENCE_EVENT_NAMES.includes(eventName)) {
    throw new TypeError(`eventName must be one of ${EVIDENCE_EVENT_NAMES.join(", ")}`);
  }
  if (!EVIDENCE_OUTCOMES.includes(outcome)) {
    throw new TypeError(`outcome must be one of ${EVIDENCE_OUTCOMES.join(", ")}`);
  }

  const occurredAt = input.occurredAt === undefined ? new Date() : input.occurredAt;
  const occurredAtUtc = toUtcIsoString(occurredAt);

  const attributeBag: Record<string, unknown> = attributes as Record<string, unknown>;
  assertEvidenceAttributes(attributeBag);
  const copiedAttributes: Record<string, unknown> = {};
  for (const key of ALLOWED_ATTRIBUTE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(attributeBag, key)) {
      copiedAttributes[key] = attributeBag[key];
    }
  }

  return Object.freeze({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    occurredAt: occurredAtUtc,
    correlationId,
    source,
    eventName,
    outcome,
    attributes: Object.freeze(copiedAttributes) as EvidenceAttributes,
  });
}
