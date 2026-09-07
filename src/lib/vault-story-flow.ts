/**
 * The vault "AI story" flow with every side effect injected, so the guard order, the
 * evidence points and the fail-closed rules can be unit-tested without a database, a
 * gateway or TanStack's server-function runtime. `vault.functions.ts` binds the real
 * dependencies and exposes the flow as a server function.
 */

import type { ServerEvidenceEmitter } from "./evidence/server";
import { recordEvidence } from "./evidence/server";
import { throwSafe } from "./safe-error";
import { isReleased, type VaultReleaseFields } from "./vault-release";
import type { VaultStoryResult } from "./vault-story";

export type VaultStoryEntry = VaultReleaseFields &
  Readonly<{
    family_id: string;
    title: string;
    content: string | null;
    transcript: string | null;
    sealed_by_name: string | null;
    recipient_names: readonly string[] | null;
  }>;

export type VaultStoryFlowDeps = Readonly<{
  /** Whether the feature flag is on. Read once per call. */
  isEnabled(): boolean;
  /** Loads the entry the caller is allowed to see, or null; a database error is thrown as-is. */
  loadEntry(entryId: string): Promise<{ entry: VaultStoryEntry | null; error: unknown | null }>;
  /** The gateway API key, if configured. */
  apiKey(): string | undefined;
  /** Every name known for the family; null means the lookup failed. */
  loadFamilyNames(familyId: string): Promise<string[] | null>;
  /** The single outbound request (see vault-story.ts). */
  writeStory(input: {
    title: string;
    sealedByName: string | null;
    recipientNames: readonly string[];
    source: string;
    familyNames: readonly string[];
  }): Promise<VaultStoryResult>;
  evidence: ServerEvidenceEmitter;
  correlationId(): string;
  now(): number;
}>;

/** User-facing texts. Unchanged since before the evidence work — keep them stable. */
export const VAULT_STORY_MESSAGES = Object.freeze({
  notConfigured: "The story writer is not configured.",
  missing: "That item does not exist.",
  sealed: "This item is still sealed.",
  noText: "There is no text to work with yet.",
  unavailable: "The story writer is unavailable.",
  rateLimited: "Too many requests right now — try again in a minute.",
  empty: "No story came back.",
});

export async function runVaultStoryFlow(
  entryId: string,
  deps: VaultStoryFlowDeps,
): Promise<{ story: string }> {
  // Opaque per-call correlation for the evidence trail. Random, unrelated to the entry,
  // the family, the user or the request.
  const correlationId = deps.correlationId();

  if (!deps.isEnabled()) {
    recordEvidence(deps.evidence.vaultStoryRejected(correlationId, "configuration", 503));
    throw new Error(VAULT_STORY_MESSAGES.notConfigured);
  }

  const { entry, error } = await deps.loadEntry(entryId);
  if (error) throwSafe(error, "vaultStory");
  if (!entry) {
    recordEvidence(deps.evidence.vaultStoryRejected(correlationId, "validation", 404));
    throw new Error(VAULT_STORY_MESSAGES.missing);
  }

  if (!isReleased(entry, deps.now())) {
    recordEvidence(deps.evidence.vaultStoryRejected(correlationId, "validation", 403));
    throw new Error(VAULT_STORY_MESSAGES.sealed);
  }

  const source = [entry.content, entry.transcript].filter(Boolean).join("\n\n");
  if (!source) {
    recordEvidence(deps.evidence.vaultStoryRejected(correlationId, "validation", 422));
    throw new Error(VAULT_STORY_MESSAGES.noText);
  }

  const apiKey = deps.apiKey();
  if (!apiKey) throw new Error(VAULT_STORY_MESSAGES.notConfigured);

  // Fail closed: without the name list the request would leave the server under-redacted.
  const familyNames = await deps.loadFamilyNames(entry.family_id);
  if (familyNames === null) throw new Error(VAULT_STORY_MESSAGES.unavailable);

  // All guards passed: the request is now accepted into the AI path.
  recordEvidence(deps.evidence.vaultStoryRequested(correlationId));
  const startedAt = deps.now();

  const result = await deps.writeStory({
    title: entry.title,
    sealedByName: entry.sealed_by_name,
    recipientNames: entry.recipient_names ?? [],
    source,
    familyNames,
  });

  if ("failure" in result) {
    if (result.failure === "rate_limited") throw new Error(VAULT_STORY_MESSAGES.rateLimited);
    if (result.failure === "unavailable") throw new Error(VAULT_STORY_MESSAGES.unavailable);
    throw new Error(VAULT_STORY_MESSAGES.empty);
  }

  recordEvidence(deps.evidence.vaultStoryCompleted(correlationId, deps.now() - startedAt));
  return { story: result.story };
}
