import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DashboardPerson = {
  id: string;
  name: string;
  birthDate: string | null;
  photoUrl: string | null;
};

export type DashboardPhoto = {
  id: string;
  caption: string;
  url: string | null;
  takenAt: string;
};

export type DashboardEvent = {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  category: string;
};

export type FamilyOverview = {
  familyName: string;
  counts: {
    members: number;
    persons: number;
    photos: number;
    upcomingEvents: number;
    stories: number;
  };
  people: DashboardPerson[];
  photos: DashboardPhoto[];
  events: DashboardEvent[];
};

/** One read for the family dashboard: who's in the tree, photos, next events. */
export const getFamilyOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FamilyOverview> => {
    const { supabase } = context;
    const nowIso = new Date().toISOString();

    const [family, members, persons, media, events, posts] = await Promise.all([
      supabase.from("families").select("name").eq("id", data.familyId).maybeSingle(),
      supabase
        .from("family_members")
        .select("user_id", { count: "exact", head: true })
        .eq("family_id", data.familyId),
      supabase
        .from("persons")
        .select("id, first_name, last_name, birth_date, photo_path", { count: "exact" })
        .eq("family_id", data.familyId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("media_items")
        .select("id, caption, storage_path, external_url, taken_at", { count: "exact" })
        .eq("family_id", data.familyId)
        .order("taken_at", { ascending: false })
        .limit(8),
      supabase
        .from("events")
        .select("id, title, starts_at, location, category", { count: "exact" })
        .eq("family_id", data.familyId)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(6),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("family_id", data.familyId),
    ]);

    const paths = [
      ...(persons.data ?? []).map((p) => p.photo_path),
      ...(media.data ?? []).map((m) => m.storage_path),
    ].filter((p): p is string => !!p);

    const signed = new Map<string, string>();
    if (paths.length > 0) {
      const { data: urls } = await supabase.storage.from("memories").createSignedUrls(paths, 900);
      for (const entry of urls ?? []) {
        if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    }

    return {
      familyName: family.data?.name ?? "Your family",
      counts: {
        members: members.count ?? 0,
        persons: persons.count ?? 0,
        photos: media.count ?? 0,
        upcomingEvents: events.count ?? 0,
        stories: posts.count ?? 0,
      },
      people: (persons.data ?? []).map((p) => ({
        id: p.id,
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        birthDate: p.birth_date,
        photoUrl: p.photo_path ? (signed.get(p.photo_path) ?? null) : null,
      })),
      photos: (media.data ?? []).map((m) => ({
        id: m.id,
        caption: m.caption,
        url: m.storage_path ? (signed.get(m.storage_path) ?? null) : m.external_url,
        takenAt: m.taken_at,
      })),
      events: (events.data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        startsAt: e.starts_at,
        location: e.location,
        category: e.category ?? "gathering",
      })),
    };
  });
