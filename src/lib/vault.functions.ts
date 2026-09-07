import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { createCorrelationId } from "./evidence/contracts";
import { recordEvidence, serverEvidence } from "./evidence/server";
import { isReleased } from "./vault-release";

export type RealVaultItem = {
  id: string;
  title: string;
  kind: "message" | "letter" | "video" | "audio";
  preview: string;
  recipients: string[];
  releaseOn: string | null;
  isOpen: boolean;
  sealedAt: string;
  sealedByName: string;
  sizeLabel: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  hasMedia: boolean;
  content: string | null;
  transcript: string | null;
  createdBy: string | null;
};

/** All vault entries of a family — content/media only after release. */
export const listVault = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RealVaultItem[]> => {
    const { data: rows, error } = await context.supabase.rpc("vault_list", {
      _family_id: data.familyId,
    });
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      preview: row.preview_label ?? "Sealed item",
      recipients: row.recipient_names ?? [],
      releaseOn: row.release_on,
      isOpen: !!row.is_open,
      sealedAt: row.sealed_at,
      sealedByName: row.sealed_by_name ?? "A family member",
      sizeLabel: row.size_label,
      mediaMime: row.media_mime,
      mediaName: row.media_name,
      hasMedia: !!row.media_name,
      content: row.content,
      transcript: row.transcript,
      createdBy: row.created_by,
    }));
  });

/** Seals a new entry. The attachment is uploaded to private storage beforehand. */
export const sealVaultEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        familyId: z.string().uuid(),
        title: z.string().trim().min(2).max(140),
        content: z.string().trim().min(1).max(20000),
        releaseOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        recipients: z.array(z.string().trim().min(1).max(80)).max(10),
        sealedByName: z.string().trim().min(1).max(80),
        media: z
          .object({
            path: z.string().min(3),
            mime: z.string().min(3).max(120),
            name: z.string().min(1).max(200),
            size: z.number().int().positive(),
          })
          .nullable()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const media = data.media ?? null;
    const mime = media?.mime ?? "";
    const kind = mime.startsWith("video/")
      ? "video"
      : mime.startsWith("audio/")
        ? "audio"
        : mime.startsWith("image/")
          ? "letter"
          : "message";

    const sizeLabel = media
      ? media.size >= 1_048_576
        ? `${(media.size / 1_048_576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(media.size / 1024))} KB`
      : `${Math.max(1, Math.round(data.content.length / 1024))} KB`;

    const { error } = await supabase.from("vault_entries").insert({
      id: data.id,
      family_id: data.familyId,
      title: data.title,
      content: data.content,
      kind,
      release_rule: "on_date",
      release_on: data.releaseOn,
      released: false,
      recipient_names: data.recipients,
      sealed_by_name: data.sealedByName,
      size_label: sizeLabel,
      preview_label: media
        ? `Sealed attachment · ${media.name}`
        : `Sealed message, ${data.content.split(/\s+/).filter(Boolean).length} words`,
      created_by: userId,
      ...(media ? { media_path: media.path, media_mime: media.mime, media_name: media.name } : {}),
    });
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/** Releases a sealed entry early. Only its author or a family admin may do this (RLS). */
export const releaseVaultEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vault_entries")
      .update({ released: true })
      .eq("id", data.entryId);
    if (error) throw new Error(error.message);
    return { id: data.entryId, released: true };
  });

/** Short-lived signed URL for a released attachment. Storage policies re-check the release. */

export const vaultMediaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ url: string | null }> => {
    const { supabase } = context;
    const { data: entry, error } = await supabase
      .from("vault_entries")
      .select("media_path, release_rule, release_on, released")
      .eq("id", data.entryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry?.media_path) return { url: null };
    if (!isReleased(entry)) return { url: null };

    const { data: signed, error: signError } = await supabase.storage
      .from("memories")
      .createSignedUrl(entry.media_path, 300);
    if (signError) throw new Error(signError.message);
    return { url: signed?.signedUrl ?? null };
  });

/**
 * Writes a short, warm "AI story" for an already-released vault entry.
 * Sealed items are refused — the model never sees locked content.
 */
export const vaultStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ story: string }> => {
    // Opaque per-call correlation for the evidence trail. It is random and unrelated to
    // the entry, the family, the user or the request — the trail records *that* a story
    // was requested, rejected or completed, never *which* one or for whom.
    const correlationId = createCorrelationId();

    const { data: entry, error } = await context.supabase
      .from("vault_entries")
      .select(
        "title, content, transcript, release_rule, release_on, released, sealed_by_name, recipient_names",
      )
      .eq("id", data.entryId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!entry) {
      recordEvidence(serverEvidence.vaultStoryRejected(correlationId, "validation", 404));
      throw new Error("That item does not exist.");
    }

    if (!isReleased(entry)) {
      recordEvidence(serverEvidence.vaultStoryRejected(correlationId, "validation", 403));
      throw new Error("This item is still sealed.");
    }

    const source = [entry.content, entry.transcript].filter(Boolean).join("\n\n").slice(0, 6000);
    if (!source) {
      recordEvidence(serverEvidence.vaultStoryRejected(correlationId, "validation", 422));
      throw new Error("There is no text to work with yet.");
    }

    // All guards passed: the request is now accepted into the AI path.
    recordEvidence(serverEvidence.vaultStoryRequested(correlationId));
    const startedAt = Date.now();

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The story writer is not configured.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You retell family keepsakes. Write 3-5 warm, plain sentences in the language of the source text. Never invent facts.",
          },
          {
            role: "user",
            content: `Title: ${entry.title}\nSealed by: ${entry.sealed_by_name ?? "a family member"}\nFor: ${(entry.recipient_names ?? []).join(", ")}\n\n${source}`,
          },
        ],
      }),
    });
    if (response.status === 429)
      throw new Error("Too many requests right now — try again in a minute.");
    if (!response.ok) throw new Error("The story writer is unavailable.");
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const story = payload.choices?.[0]?.message?.content?.trim();
    if (!story) throw new Error("No story came back.");
    recordEvidence(serverEvidence.vaultStoryCompleted(correlationId, Date.now() - startedAt));
    return { story };
  });
