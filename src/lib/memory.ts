/**
 * Pure, client-safe helpers for the first-memory flow.
 *
 * No Supabase, no server imports — these run in the browser, on the server
 * and in unit tests alike. The server function in `memory.functions.ts`
 * layers session and family-membership checks on top.
 */
import { z } from "zod";

export const MEMORY_STORY_MAX = 5000;
export const MEMORY_MEANING_MAX = 1000;
export const MEMORY_TITLE_MAX = 140;
/** Voice answers stay short on purpose: a few minutes, not an oral history. */
export const MEMORY_RECORDING_MAX_BYTES = 25 * 1024 * 1024;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 1968-07-18.");

export const memoryRecordingSchema = z.object({
  path: z.string().min(3).max(400),
  mime: z.string().min(3).max(120),
  size: z.number().int().positive().max(MEMORY_RECORDING_MAX_BYTES),
});

export const createMemoryInputSchema = z
  .object({
    familyId: z.string().uuid(),
    promptId: z.string().trim().min(1).max(40),
    question: z.string().trim().min(3).max(240),
    title: z.string().trim().min(2).max(MEMORY_TITLE_MAX),
    story: z.string().trim().max(MEMORY_STORY_MAX),
    happenedOn: isoDate.optional(),
    place: z.string().trim().max(120).optional(),
    meaning: z.string().trim().max(MEMORY_MEANING_MAX).optional(),
    /** Link to a person already in the family tree… */
    personId: z.string().uuid().optional(),
    /** …or add a new one by name. `personId` wins if both are set. */
    personName: z.string().trim().min(1).max(120).optional(),
    recording: memoryRecordingSchema.optional(),
  })
  .refine((v) => v.story.length > 0 || v.recording !== undefined, {
    message: "Write a few words or record an answer before saving.",
    path: ["story"],
  })
  .refine((v) => v.recording === undefined || v.story.length > 0, {
    message: "Add a short written note so the recording has a text alternative.",
    path: ["story"],
  });

export type CreateMemoryInput = z.infer<typeof createMemoryInputSchema>;

/**
 * Private objects for a memory live under `<familyId>/memories/<memoryId>/<file>`.
 * The server refuses any other shape so one family can never reference another
 * family's files, and vault objects (which have their own release rules) stay out.
 */
export function memoryStoragePathBelongsTo(familyId: string, path: string): boolean {
  const pattern = new RegExp(
    `^${escapeRegExp(familyId)}/memories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[\\w.-]{1,200}$`,
    "i",
  );
  return pattern.test(path);
}

/** Builds the storage path the browser should upload a recording to. */
export function memoryRecordingPath(familyId: string, memoryId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.-]+/g, "_").slice(-120) || "recording";
  return `${familyId}/memories/${memoryId}/${safe}`;
}

/** `kind` in the `memories` table: a voice answer is audio, everything else a story. */
export function memoryKindFor(input: Pick<CreateMemoryInput, "recording">): "audio" | "story" {
  return input.recording ? "audio" : "story";
}

/**
 * The `memories` table keeps one free-text `description`. We fold the
 * question, the answer and the "why it matters" note into it so the memory
 * stays readable anywhere the table is shown, without a schema change.
 */
export function buildMemoryDescription(
  input: Pick<CreateMemoryInput, "question" | "story" | "meaning">,
): string {
  const parts = [`Q: ${input.question.trim()}`];
  if (input.story.trim()) parts.push(input.story.trim());
  if (input.meaning?.trim()) parts.push(`Why it matters: ${input.meaning.trim()}`);
  return parts.join("\n\n");
}

/** Splits "Helen Johnson (née Wright)" into the two name columns of `persons`. */
export function splitPersonName(name: string): { firstName: string; lastName: string | null } {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: null };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
