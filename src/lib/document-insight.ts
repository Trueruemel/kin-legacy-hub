/**
 * Turns a scanned historic document (image or PDF) into a faithful transcription and a
 * short summary. Only the document itself is sent — no family names or other text.
 */
import { PHOTO_INSIGHT_MODEL, PHOTO_INSIGHT_URL, readOutputText } from "./photo-insight";

const SYSTEM_PROMPT =
  "You transcribe old family documents: letters, certificates, diaries, newspaper clippings. " +
  "Transcribe the visible text faithfully in its original language, keeping line breaks where " +
  "helpful. Mark unreadable words as [unreadable]; never invent text. Then write a short, plain " +
  "summary (2-4 sentences, in English) of what the document is and says.";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["transcription", "summary"],
  properties: {
    transcription: { type: "string" },
    summary: { type: "string" },
  },
} as const;

export type DocumentInsightResult =
  | Readonly<{ transcription: string; summary: string }>
  | Readonly<{ failure: "rate_limited" | "unavailable" | "empty" | "no_credits" | "denied" }>;

export type DocumentSource =
  | Readonly<{ kind: "image"; url: string }>
  | Readonly<{ kind: "pdf"; filename: string; base64: string }>;

export async function transcribeDocument(
  source: DocumentSource,
  deps: Readonly<{ apiKey: string; fetchImpl: typeof fetch }>,
): Promise<DocumentInsightResult> {
  const part =
    source.kind === "image"
      ? { type: "input_image", image_url: source.url }
      : {
          type: "input_file",
          filename: source.filename,
          file_data: `data:application/pdf;base64,${source.base64}`,
        };

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
              { type: "input_text", text: "Transcribe and summarise this family document." },
              part,
            ],
          },
        ],
        text: {
          format: { type: "json_schema", name: "document_insight", strict: true, schema: SCHEMA },
        },
      }),
    });
  } catch {
    return { failure: "unavailable" };
  }
  if (response.status === 429) return { failure: "rate_limited" };
  if (response.status === 402) return { failure: "no_credits" };
  if (response.status === 403) return { failure: "denied" };
  if (!response.ok) return { failure: "unavailable" };

  let raw = "";
  try {
    raw = await readOutputText(response);
  } catch {
    return { failure: "unavailable" };
  }
  try {
    const parsed = JSON.parse(raw) as { transcription?: unknown; summary?: unknown };
    const transcription = typeof parsed.transcription === "string" ? parsed.transcription.trim() : "";
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    if (!transcription && !summary) return { failure: "empty" };
    return { transcription, summary };
  } catch {
    return { failure: "empty" };
  }
}
