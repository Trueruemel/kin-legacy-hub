import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

import { createCorrelationId } from "./evidence/contracts";
import { recordEvidence, serverEvidence } from "./evidence/server";
import { isReleased } from "./vault-release";
import { writeVaultStory } from "./vault-story";
import { runVaultStoryFlow } from "./vault-story-flow";

/**
 * The AI story feature is off unless explicitly switched on. Even when on, the request
 * is pseudonymised (see vault-story.ts). Turning it on is a product/legal decision
 * (Entscheidungsregister D-10): it means pseudonymised family text is processed by an
 * external gateway.
 */
function isVaultStoryEnabled(): boolean {
  return process.env["VAULT_STORY_ENABLED"] === "true";
}

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
  /** Optional moment after which the entry closes again. */
  accessExpiresAt: string | null;
};

export type VaultAccessEvent = {
  id: string;
  action: "opened" | "downloaded" | "released" | "expiry_changed";
  actorName: string;
  at: string;
  entryId: string;
};

/** All vault entries of a family — content/media only after release. */
export const listVault = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RealVaultItem[]> => {
    const { data: rows, error } = await context.supabase.rpc("vault_list", {
      _family_id: data.familyId,
    });
    if (error) throwSafe(error, "listVault");

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
      accessExpiresAt: row.access_expires_at ?? null,
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
        /** Optional day after which the opened item closes again. */
        accessExpiresOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
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
      ...(data.accessExpiresOn
        ? { access_expires_at: new Date(`${data.accessExpiresOn}T23:59:59Z`).toISOString() }
        : {}),
      ...(media ? { media_path: media.path, media_mime: media.mime, media_name: media.name } : {}),
    });
    if (error) throwSafe(error, "sealVaultEntry");
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
    if (error) throwSafe(error, "releaseVaultEntry");
    await logVaultAccess(context, data.entryId, "released");
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
      .select("media_path, release_rule, release_on, released, access_expires_at")
      .eq("id", data.entryId)
      .maybeSingle();
    if (error) throwSafe(error, "vaultMediaUrl");
    if (!entry?.media_path) return { url: null };
    if (!isReleased(entry)) return { url: null };

    const { data: signed, error: signError } = await supabase.storage
      .from("memories")
      .createSignedUrl(entry.media_path, 300);
    if (signError) throwSafe(signError, "vaultMediaUrl");
    await logVaultAccess(context, data.entryId, "downloaded");
    return { url: signed?.signedUrl ?? null };
  });

/**
 * Writes a short, warm "AI story" for an already-released vault entry.
 * Sealed items are refused — the model never sees locked content.
 */
export const vaultStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ story: string }> =>
    // The flow itself (guard order, evidence points, fail-closed rules) lives in
    // vault-story-flow.ts and is unit-tested there; this binds the real dependencies.
    runVaultStoryFlow(data.entryId, {
      isEnabled: isVaultStoryEnabled,
      loadEntry: async (entryId) => {
        const { data: entry, error } = await context.supabase
          .from("vault_entries")
          .select(
            "family_id, title, content, transcript, release_rule, release_on, released, sealed_by_name, recipient_names",
          )
          .eq("id", entryId)
          .maybeSingle();
        return { entry, error };
      },
      apiKey: () => process.env["LOVABLE_API_KEY"],
      loadFamilyNames,
      writeStory: (input) =>
        writeVaultStory(input, { apiKey: process.env["LOVABLE_API_KEY"] ?? "", fetchImpl: fetch }),
      evidence: serverEvidence,
      correlationId: createCorrelationId,
      now: Date.now,
    }),
  );

/**
 * Names the pseudonymiser must know for a family: people in the tree (first, last and
 * birth names) and the display names of member profiles.
 *
 * Read with the service-role client on purpose: the caller's own client is subject to
 * `member_visibility` RLS, so a member without tree access would receive an empty list
 * *without* an error and the request would leave the server under-redacted. The list is
 * scoped to the family of the entry the caller was already allowed to read, and it never
 * leaves this function except as placeholders.
 *
 * Returns null on any failure so the caller fails closed.
 */
async function loadFamilyNames(familyId: string): Promise<string[] | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [persons, members] = await Promise.all([
      supabaseAdmin
        .from("persons")
        .select("first_name, last_name, birth_name")
        .eq("family_id", familyId),
      supabaseAdmin.from("family_members").select("user_id").eq("family_id", familyId),
    ]);
    if (persons.error || members.error) return null;

    const names: string[] = [];
    for (const person of persons.data ?? []) {
      const full = [person.first_name, person.last_name].filter(Boolean).join(" ");
      if (full) names.push(full);
      if (person.birth_name) names.push(`${person.first_name} ${person.birth_name}`);
    }

    const userIds = (members.data ?? []).map((m) => m.user_id).filter(Boolean);
    if (userIds.length > 0) {
      const profiles = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .in("id", userIds);
      if (profiles.error) return null;
      for (const profile of profiles.data ?? []) {
        if (profile.display_name) names.push(profile.display_name);
      }
    }
    return names;
  } catch {
    return null;
  }
}

/** Display name of the signed-in member, for the access log. */
async function actorName(
  supabase: { from: (table: string) => any },
  userId: string,
): Promise<string> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    return (data?.display_name as string | undefined) ?? "A family member";
  } catch {
    return "A family member";
  }
}

/**
 * Writes one line into the family's vault access log. Append-only by policy:
 * nobody — author or admin — can edit or remove a recorded access.
 */
async function logVaultAccess(
  context: { supabase: any; userId: string },
  entryId: string,
  action: VaultAccessEvent["action"],
): Promise<void> {
  const { data: entry } = await context.supabase
    .from("vault_entries")
    .select("family_id")
    .eq("id", entryId)
    .maybeSingle();
  if (!entry?.family_id) return;
  await context.supabase.from("vault_access_log").insert({
    entry_id: entryId,
    family_id: entry.family_id,
    user_id: context.userId,
    actor_name: await actorName(context.supabase, context.userId),
    action,
  });
}

/**
 * Confirms that the member really wants to look inside an opened item, and records it.
 * The UI asks for this confirmation before it shows any content.
 */
export const confirmVaultAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ recorded: boolean }> => {
    const { data: entry, error } = await context.supabase
      .from("vault_entries")
      .select("release_rule, release_on, released, access_expires_at")
      .eq("id", data.entryId)
      .maybeSingle();
    if (error) throwSafe(error, "confirmVaultAccess");
    if (!entry || !isReleased(entry)) return { recorded: false };
    await logVaultAccess(context, data.entryId, "opened");
    return { recorded: true };
  });

/** Sets or clears the moment an opened item closes again. Author or family admin only (RLS). */
export const setVaultAccessExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        entryId: z.string().uuid(),
        expiresOn: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const value = data.expiresOn
      ? new Date(`${data.expiresOn}T23:59:59Z`).toISOString()
      : null;
    const { error } = await context.supabase
      .from("vault_entries")
      .update({ access_expires_at: value })
      .eq("id", data.entryId);
    if (error) throwSafe(error, "setVaultAccessExpiry");
    await logVaultAccess(context, data.entryId, "expiry_changed");
    return { entryId: data.entryId, accessExpiresAt: value };
  });

/** The access log of one entry, newest first. Readable by every family member. */
export const listVaultAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ entryId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<VaultAccessEvent[]> => {
    const { data: rows, error } = await context.supabase
      .from("vault_access_log")
      .select("id, entry_id, action, actor_name, created_at")
      .eq("entry_id", data.entryId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throwSafe(error, "listVaultAccess");
    return (rows ?? []).map((row: any) => ({
      id: row.id,
      entryId: row.entry_id,
      action: row.action,
      actorName: row.actor_name ?? "A family member",
      at: row.created_at,
    }));
  });
