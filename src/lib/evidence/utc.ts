/**
 * UTC helpers for evidence records.
 *
 * Every timestamp that enters an evidence record is produced here, so there is exactly
 * one place that guarantees RFC 3339 with millisecond precision and a trailing `Z`.
 * No local time, no offsets, no epoch numbers.
 *
 * This module has no dependencies, reads no environment and performs no I/O.
 */

const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Formats a Date as `YYYY-MM-DDTHH:mm:ss.sssZ`.
 *
 * Only real, valid `Date` instances are accepted: a string, a number or an invalid
 * Date would otherwise silently become `"Invalid Date"` or a local-time value.
 */
export function toUtcIsoString(now: Date): string {
  if (!(now instanceof Date)) {
    throw new TypeError("toUtcIsoString expects a Date instance");
  }
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("toUtcIsoString received an invalid Date");
  }
  return now.toISOString();
}

/**
 * True only for the canonical format produced by {@link toUtcIsoString} and only when
 * the value round-trips through Date, which rejects impossible calendar dates.
 */
export function isUtcIsoString(value: string): boolean {
  if (typeof value !== "string" || !UTC_ISO_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}
