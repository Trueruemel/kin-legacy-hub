/**
 * User-safe errors for server functions.
 *
 * The UI shows `error.message` of a failed server function in a toast. Until now the
 * server functions forwarded database and provider messages verbatim, so users (and
 * anyone reading a screenshot) could see table names, constraint names, policy names
 * and provider URLs. `throwSafe` replaces that with one of six fixed, closed texts,
 * chosen by the same closed category the evidence layer uses, and keeps the original
 * error where it belongs: in the server log.
 *
 * Messages that a server function throws *on purpose* ("This item is still sealed.")
 * are not affected — those are product wording, not leaked diagnostics.
 */

import { classifySafeError, type SafeErrorCategory } from "./evidence/redact";

export const SAFE_ERROR_MESSAGES: Readonly<Record<SafeErrorCategory, string>> = Object.freeze({
  authentication: "You don't have permission to do that.",
  validation: "That didn't work — please check the details and try again.",
  rate_limit: "Too many requests right now — try again in a minute.",
  configuration: "This feature is not configured yet.",
  upstream: "Something went wrong on our side. Please try again.",
  unknown: "Something went wrong. Please try again.",
});

/**
 * Postgres SQLSTATE and PostgREST codes we can classify with confidence. Everything
 * else with a database-style code is treated as an upstream failure.
 */
const PG_AUTHENTICATION: ReadonlySet<string> = new Set(["42501", "28000", "28P01"]);
const PG_VALIDATION: ReadonlySet<string> = new Set([
  "23505", // unique_violation
  "23503", // foreign_key_violation
  "23514", // check_violation
  "23502", // not_null_violation
  "22P02", // invalid_text_representation
  "22001", // string_data_right_truncation
  "22003", // numeric_value_out_of_range
  "22007", // invalid_datetime_format
  "22008", // datetime_field_overflow
]);
const POSTGREST_VALIDATION_PREFIXES = ["PGRST1"]; // PGRST100–PGRST122: request/schema/row errors
const POSTGREST_AUTHENTICATION_PREFIXES = ["PGRST30"]; // PGRST300–PGRST303: JWT errors

function readCode(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === "string" && code.length > 0 ? code : undefined;
}

/** Closed category for any thrown value, including PostgrestError-shaped objects. */
export function categorizeError(error: unknown): SafeErrorCategory {
  const code = readCode(error);
  if (code !== undefined) {
    if (PG_AUTHENTICATION.has(code)) return "authentication";
    if (PG_VALIDATION.has(code)) return "validation";
    if (POSTGREST_AUTHENTICATION_PREFIXES.some((p) => code.startsWith(p))) return "authentication";
    if (POSTGREST_VALIDATION_PREFIXES.some((p) => code.startsWith(p))) return "validation";
    if (/^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(code)) return "upstream";
  }
  return classifySafeError(error).category;
}

/**
 * Logs the original error server-side and throws a fresh Error carrying only a closed
 * user text. No `cause` is attached: TanStack Start serialises thrown errors to the
 * client, and a cause chain would reintroduce the leak.
 */
export function throwSafe(error: unknown, operation: string): never {
  console.error(`[server] ${operation} failed`, error);
  throw new Error(SAFE_ERROR_MESSAGES[categorizeError(error)]);
}
