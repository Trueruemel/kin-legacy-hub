/**
 * The AI request that turns a historic family photo into a plain description and a
 * handful of memory questions a family can ask their older relatives.
 *
 * Only the picture itself is sent — never the caption, the uploader's name or any other
 * family text — so no personal data leaves the process beyond the image the family
 * explicitly asked us to look at. `fetch` is injected so tests can prove what is sent.
 *
 * Failures are returned as closed values, never thrown provider errors, so the caller
 * keeps control over the wording the family sees.
 */

export const PHOTO_INSIGHT_URL = "https://ai.gateway.lovable.dev/v1/responses";
export const PHOTO_INSIGHT_MODEL = "openai/gpt-6-astra";

const SYSTEM_PROMPT =
  "You look at old family photographs. Describe only what is actually visible in plain, " +
  "warm language: people, clothing, place, objects, the era the scene suggests. Never " +
  "invent names, dates or relationships, and never guess who somebody is. Then propose " +
  "short questions a family could ask an older relative to recover the memory behind the " +
  "picture. Answer in English.";

export type PhotoInsight = Readonly<{ description: string; questions: string[] }>;

export type PhotoInsightResult =
  | PhotoInsight
  | Readonly<{ failure: "rate_limited" | "unavailable" | "empty" | "no_credits" }>;

export type PhotoInsightDeps = Readonly<{ apiKey: string; fetchImpl: typeof fetch }>;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["description", "questions"],
  properties: {
    description: { type: "string", description: "Three to five sentences about the photo." },
    questions: {
      type: "array",
      description: "Three to five short memory questions for an older relative.",
      items: { type: "string" },
    },
  },
} as const;

/** Reads the gateway's SSE stream and joins the answer text. */
export async function readOutputText(response: Response): Promise<string> {
  const body = response.body;
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completed = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && event.response?.output_text) {
          completed = event.response.output_text;
        }
      } catch {
        // Ignore keep-alive and partial frames.
      }
    }
  }
  return (text || completed).trim();
}

export async function describeHistoricPhoto(
  input: Readonly<{ imageUrl: string }>,
  deps: PhotoInsightDeps,
): Promise<PhotoInsightResult> {
  let response: Response;
  try {
    response = await deps.fetchImpl(PHOTO_INSIGHT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": deps.apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: PHOTO_INSIGHT_MODEL,
        stream: true,
        instructions: SYSTEM_PROMPT,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        store: false,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Describe this family photograph and suggest memory questions.",
              },
              { type: "input_image", image_url: input.imageUrl },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "photo_insight",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
      }),
    });
  } catch {
    return { failure: "unavailable" };
  }

  if (response.status === 429) return { failure: "rate_limited" };
  if (response.status === 402) return { failure: "no_credits" };
  if (!response.ok) return { failure: "unavailable" };

  let raw: string;
  try {
    raw = await readOutputText(response);
  } catch {
    return { failure: "unavailable" };
  }
  if (!raw) return { failure: "empty" };

  return parsePhotoInsight(raw);
}

/** Exported for tests: turns the model's JSON answer into a usable insight. */
export function parsePhotoInsight(raw: string): PhotoInsightResult {
  let parsed: { description?: unknown; questions?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { failure: "empty" };
  }
  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .filter((q): q is string => typeof q === "string")
        .map((q) => q.trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];
  if (!description) return { failure: "empty" };
  return { description, questions };
}
