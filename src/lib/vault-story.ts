/**
 * The AI "story" request for a released vault entry, with the pseudonymisation
 * boundary built in.
 *
 * This module owns the only place where vault text is turned into an outbound request.
 * Before anything is serialised, every known name of the family (author, recipients,
 * persons in the tree, member profiles) and every e-mail, phone number, IBAN, full date
 * and street address is replaced with a placeholder; the model's answer is mapped back
 * afterwards. `fetch` is injected so tests can prove what leaves the process.
 *
 * Failure is reported as a closed value, never as a thrown provider error, so the
 * caller keeps full control over user-facing wording.
 */

import { createPseudonymizer } from "./privacy/pseudonymize";

export const VAULT_STORY_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export const VAULT_STORY_MODEL = "google/gemini-2.5-flash";
export const VAULT_STORY_SOURCE_LIMIT = 6000;

const SYSTEM_PROMPT =
  "You retell family keepsakes. Write 3-5 warm, plain sentences in the language of the " +
  "source text. Never invent facts. The text contains placeholders such as [PERSON_1], " +
  "[PERSON_1_FIRST], [EMAIL_1] or [DATE_1] that stand for real names and details: keep " +
  "every placeholder exactly unchanged and do not guess what it stands for.";

export type VaultStoryInput = Readonly<{
  title: string;
  sealedByName: string | null;
  recipientNames: readonly string[];
  /** Content and transcript, already joined by the caller. */
  source: string;
  /** Every other name known for the family (persons in the tree, member display names). */
  familyNames: readonly string[];
}>;

export type VaultStoryDeps = Readonly<{
  apiKey: string;
  fetchImpl: typeof fetch;
}>;

export type VaultStoryResult =
  Readonly<{ story: string }> | Readonly<{ failure: "rate_limited" | "unavailable" | "empty" }>;

export async function writeVaultStory(
  input: VaultStoryInput,
  deps: VaultStoryDeps,
): Promise<VaultStoryResult> {
  const pseudonymizer = createPseudonymizer([
    input.sealedByName ?? "",
    ...input.recipientNames,
    ...input.familyNames,
  ]);

  const title = pseudonymizer.apply(input.title);
  const sealedBy = pseudonymizer.apply(input.sealedByName ?? "a family member");
  const recipients = input.recipientNames.map((name) => pseudonymizer.apply(name)).join(", ");
  const source = pseudonymizer.apply(input.source).slice(0, VAULT_STORY_SOURCE_LIMIT);

  let response: Response;
  try {
    response = await deps.fetchImpl(VAULT_STORY_GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${deps.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: VAULT_STORY_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Title: ${title}\nSealed by: ${sealedBy}\nFor: ${recipients}\n\n${source}`,
          },
        ],
      }),
    });
  } catch {
    return { failure: "unavailable" };
  }

  if (response.status === 429) return { failure: "rate_limited" };
  if (!response.ok) return { failure: "unavailable" };

  let payload: { choices?: { message?: { content?: string } }[] };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { failure: "empty" };
  }
  const raw = payload?.choices?.[0]?.message?.content?.trim();
  if (!raw) return { failure: "empty" };

  return { story: pseudonymizer.restore(raw) };
}
