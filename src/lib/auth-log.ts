import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { createCorrelationId } from "./evidence/contracts";
import { recordEvidence, serverEvidence } from "./evidence/server";

type Diagnosis = "missing" | "empty" | "wrong-scheme" | "not-a-jwt" | "ok";

/** Classifies the Authorization header without ever logging its value. */
function diagnose(header: string | undefined): Diagnosis {
  if (header === undefined) return "missing";
  const value = header.trim();
  if (value.length === 0) return "empty";
  const [scheme, ...rest] = value.split(/\s+/);
  if ((scheme ?? "").toLowerCase() !== "bearer") return "wrong-scheme";
  const token = rest.join("");
  if (token.split(".").length !== 3) return "not-a-jwt";
  return "ok";
}

/**
 * Server-side diagnostics for authenticated server functions.
 *
 * Logs *why* an Authorization header was rejected — never the token, the
 * credential, or any header value. Safe details only: shape of the header,
 * token length, request path and method.
 */
export const logAuthHeader = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const header = getRequestHeader("authorization") ?? undefined;
  const state = diagnose(header);

  if (state !== "ok") {
    // Evidence trail: only the fact of a rejection, as a closed category. The header
    // shape, lengths, segment counts and cookie/api-key presence below stay in the
    // existing product diagnostic and are deliberately NOT part of the evidence event.
    recordEvidence(serverEvidence.authHeaderRejected(createCorrelationId(), "authentication"));

    const token = header?.trim().split(/\s+/).slice(1).join("") ?? "";
    console.warn(
      "[auth] rejected server-function request",
      JSON.stringify({
        reason: state,
        hasHeader: header !== undefined,
        headerLength: header?.length ?? 0,
        tokenSegments: token ? token.split(".").length : 0,
        tokenLength: token.length,
        hasApiKeyHeader: getRequestHeader("apikey") !== undefined,
        hasCookie: getRequestHeader("cookie") !== undefined,
      }),
    );
  }

  return next();
});
