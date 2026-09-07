/**
 * Safe error classification for evidence records.
 *
 * `classifySafeError` is the only bridge between a raw failure and an evidence event.
 * It reduces any thrown value to a closed category and, when present, an integer HTTP
 * status — and returns nothing else. The message, stack, cause chain, path, URL,
 * provider payload and request context are read at most to pick a category and are
 * never returned, retained or serialised.
 *
 * No dependencies, no environment access, no I/O.
 */

import { SAFE_ERROR_CATEGORIES, type SafeErrorCategory } from "./contracts";

export { SAFE_ERROR_CATEGORIES, type SafeErrorCategory };

export type SafeErrorClassification = Readonly<{
  category: SafeErrorCategory;
  httpStatus?: number;
}>;

/** Error names that reliably indicate a validation failure without inspecting content. */
const VALIDATION_ERROR_NAMES: ReadonlySet<string> = new Set(["ZodError", "ValidationError"]);

/** Error names that indicate the upstream call itself failed (network, abort, timeout). */
const UPSTREAM_ERROR_NAMES: ReadonlySet<string> = new Set([
  "AbortError",
  "TimeoutError",
  "FetchError",
]);

/**
 * Messages the product itself throws when a required setting is absent. Matching is done
 * on the message, but the message is not part of the result.
 */
const CONFIGURATION_PATTERN = /\bnot configured\b|\bmissing (?:api[_ ]?key|configuration)\b/i;

/** `TypeError: fetch failed` is how undici reports a failed connection. */
const NETWORK_TYPE_ERROR_PATTERN =
  /^fetch failed\b|\bnetwork\b|\bECONN|\bENOTFOUND\b|\bETIMEDOUT\b/i;

function readHttpStatus(error: unknown): number | undefined {
  if (error === null || typeof error !== "object") return undefined;
  // Response exposes `status`; SDK errors commonly expose `status` or `statusCode`.
  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
  const candidate = typeof status === "number" ? status : statusCode;
  return typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 100 &&
    candidate <= 599
    ? candidate
    : undefined;
}

function categoryForStatus(status: number): SafeErrorCategory {
  if (status === 401 || status === 403) return "authentication";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "upstream";
  if (status >= 400) return "validation";
  return "unknown";
}

function categoryForError(error: Error): SafeErrorCategory {
  if (VALIDATION_ERROR_NAMES.has(error.name)) return "validation";
  if (UPSTREAM_ERROR_NAMES.has(error.name)) return "upstream";
  if (error instanceof TypeError && NETWORK_TYPE_ERROR_PATTERN.test(error.message)) {
    return "upstream";
  }
  if (CONFIGURATION_PATTERN.test(error.message)) return "configuration";
  return "unknown";
}

/**
 * Reduces any thrown value to `{ category }` or `{ category, httpStatus }`.
 * The result is frozen and contains no reference to the input.
 */
export function classifySafeError(error: unknown): SafeErrorClassification {
  const httpStatus = readHttpStatus(error);

  let category: SafeErrorCategory;
  if (httpStatus !== undefined) {
    category = categoryForStatus(httpStatus);
  } else if (error instanceof Error) {
    category = categoryForError(error);
  } else {
    category = "unknown";
  }

  return httpStatus === undefined
    ? Object.freeze({ category })
    : Object.freeze({ category, httpStatus });
}
