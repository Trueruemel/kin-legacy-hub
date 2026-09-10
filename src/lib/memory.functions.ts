import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  buildMemoryDescription,
  createMemoryInputSchema,
  memoryKindFor,
  memoryStoragePathBelongsTo,
  splitPersonName,
} from "./memory";
import { throwSafe } from "./safe-error";

export type MemorySummary = {
  id: string;
  title: string;
  description: string | null;
  kind: "photo" | "document" | "audio" | "video" | "story";
  happenedOn: string | null;
  place: string | null;
  createdAt: string;
  /** Short-lived signed URL for the private recording or photo, if any. */
  mediaUrl: string | null;
  mediaMime: string | null;
  people: string[];
};

const MEMBERSHIP_ERROR = "You are not a member of this family archive.";
const ROLE_ERROR = "Viewers can read the archive but cannot add memories.";

/**
 * Saves a first memory into the existing `memories` table.
 *
 * Order of checks, all on the server:
 *   session (middleware) → family membership → role may write → Zod input →
 *   storage path belongs to this family → person belongs to this family →
 *   insert only whitelisted columns.
 * `created_by` always comes from the session, never from the browser.
 */
export const createMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createMemoryInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Membership is enforced by RLS as well; checking it here gives the person a
    // clear answer instead of a generic database error, and refuses viewers.
    const { data: membership, error: membershipError } = await supabase
      .from("family_members")
      .select("role")
      .eq("family_id", data.familyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membershipError) throwSafe(membershipError, "createMemory");
    if (!membership) throw new Error(MEMBERSHIP_ERROR);
    if (membership.role === "viewer") throw new Error(ROLE_ERROR);

    if (data.recording && !memoryStoragePathBelongsTo(data.familyId, data.recording.path)) {
      throw new Error("That recording does not belong to this family archive.");
    }

    let personId: string | null = null;
    if (data.personId) {
      const { data: person, error: personError } = await supabase
        .from("persons")
        .select("id")
        .eq("id", data.personId)
        .eq("family_id", data.familyId)
        .maybeSingle();
      if (personError) throwSafe(personError, "createMemory");
      if (!person) throw new Error("That person is not in this family tree.");
      personId = person.id;
    } else if (data.personName) {
      const { firstName, lastName } = splitPersonName(data.personName);
      const newPersonId = crypto.randomUUID();
      const { error: insertPersonError } = await supabase.from("persons").insert({
        id: newPersonId,
        family_id: data.familyId,
        first_name: firstName,
        last_name: lastName,
        created_by: userId,
      });
      if (insertPersonError) throwSafe(insertPersonError, "createMemory");
      personId = newPersonId;
    }

    const memoryId = crypto.randomUUID();
    const { error } = await supabase.from("memories").insert({
      id: memoryId,
      family_id: data.familyId,
      created_by: userId,
      kind: memoryKindFor(data),
      title: data.title,
      description: buildMemoryDescription(data),
      happened_on: data.happenedOn ?? null,
      place: data.place?.trim() ? data.place.trim() : null,
      media_path: data.recording?.path ?? null,
      media_mime: data.recording?.mime ?? null,
    });
    if (error) throwSafe(error, "createMemory");

    if (personId) {
      const { error: linkError } = await supabase.from("memory_persons").insert({
        family_id: data.familyId,
        memory_id: memoryId,
        person_id: personId,
      });
      if (linkError) throwSafe(linkError, "createMemory");
    }

    return { id: memoryId, kind: memoryKindFor(data), personId };
  });

/** People in the family tree, for the "who is this memory about?" picker. */
export const listMemoryPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; name: string }[]> => {
    const { data: persons, error } = await context.supabase
      .from("persons")
      .select("id, first_name, last_name")
      .eq("family_id", data.familyId)
      .order("first_name", { ascending: true })
      .limit(200);
    if (error) throwSafe(error, "listMemoryPeople");
    return (persons ?? []).map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" "),
    }));
  });

/** The family's most recent memories, with short-lived signed URLs for private files. */
export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<MemorySummary[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("memories")
      .select(
        "id, title, description, kind, happened_on, place, created_at, media_path, media_mime",
      )
      .eq("family_id", data.familyId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throwSafe(error, "listMemories");
    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const { data: links } = await supabase
      .from("memory_persons")
      .select("memory_id, person_id")
      .in("memory_id", ids);
    const personIds = [...new Set((links ?? []).map((l) => l.person_id))];
    const { data: persons } =
      personIds.length > 0
        ? await supabase.from("persons").select("id, first_name, last_name").in("id", personIds)
        : { data: [] as { id: string; first_name: string; last_name: string | null }[] };
    const nameOf = (id: string) => {
      const p = (persons ?? []).find((x) => x.id === id);
      return p ? [p.first_name, p.last_name].filter(Boolean).join(" ") : null;
    };

    const paths = rows.map((r) => r.media_path).filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      const { data: urls } = await supabase.storage.from("memories").createSignedUrls(paths, 900);
      for (const entry of urls ?? []) {
        if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    }

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      kind: r.kind,
      happenedOn: r.happened_on,
      place: r.place,
      createdAt: r.created_at,
      mediaUrl: r.media_path ? (signed.get(r.media_path) ?? null) : null,
      mediaMime: r.media_mime,
      people: (links ?? [])
        .filter((l) => l.memory_id === r.id)
        .map((l) => nameOf(l.person_id))
        .filter((n): n is string => !!n),
    }));
  });
