import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

export type GalleryAlbum = {
  id: string;
  name: string;
  description: string | null;
  year: number | null;
  count: number;
};

export type GalleryItem = {
  id: string;
  albumId: string | null;
  caption: string;
  url: string | null;
  mime: string | null;
  takenAt: string;
  uploadedByName: string | null;
  aiTags: string[];
  transcript: string | null;
};

/** Albums and media of a family, with short-lived signed URLs for private files. */
export const listGallery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ albums: GalleryAlbum[]; items: GalleryItem[] }> => {
    const { supabase } = context;
    const [{ data: albums, error }, { data: media, error: mediaError }] = await Promise.all([
      supabase
        .from("albums")
        .select("id, name, description, year")
        .eq("family_id", data.familyId)
        .order("year", { ascending: false, nullsFirst: false }),
      supabase
        .from("media_items")
        .select(
          "id, album_id, caption, storage_path, external_url, media_mime, taken_at, uploaded_by_name, ai_tags, transcript",
        )
        .eq("family_id", data.familyId)
        .order("taken_at", { ascending: false })
        .limit(300),
    ]);
    if (error) throwSafe(error, "listGallery");
    if (mediaError) throwSafe(mediaError, "listGallery");

    const paths = (media ?? []).map((m) => m.storage_path).filter((p): p is string => !!p);
    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from("memories").createSignedUrls(paths, 900);
      for (const entry of signed ?? []) {
        if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
      }
    }

    const items: GalleryItem[] = (media ?? []).map((m) => ({
      id: m.id,
      albumId: m.album_id,
      caption: m.caption,
      url: m.storage_path ? (signedByPath.get(m.storage_path) ?? null) : m.external_url,
      mime: m.media_mime,
      takenAt: m.taken_at,
      uploadedByName: m.uploaded_by_name,
      aiTags: m.ai_tags ?? [],
      transcript: m.transcript,
    }));

    return {
      albums: (albums ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        year: a.year,
        count: items.filter((i) => i.albumId === a.id).length,
      })),
      items,
    };
  });

/** Creates an album. */
export const createAlbum = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        name: z.string().trim().min(2).max(90),
        description: z.string().trim().max(400).optional(),
        year: z.number().int().min(1800).max(2200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const id = crypto.randomUUID();
    const slug = `${data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${id.slice(0, 6)}`;
    const { error } = await context.supabase.from("albums").insert({
      id,
      family_id: data.familyId,
      slug,
      name: data.name,
      description: data.description ?? null,
      year: data.year ?? null,
    });
    if (error) throwSafe(error, "createAlbum");
    return { id };
  });

/** Records an uploaded file (already in private storage) as a media item. */
export const addMediaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        albumId: z.string().uuid().nullable().optional(),
        caption: z.string().trim().min(1).max(240),
        storagePath: z.string().min(3).max(400),
        mime: z.string().min(3).max(120),
        uploadedByName: z.string().trim().min(1).max(80),
        transcript: z.string().trim().max(20000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const id = crypto.randomUUID();
    const { error } = await context.supabase.from("media_items").insert({
      id,
      family_id: data.familyId,
      album_id: data.albumId ?? null,
      slug: id,
      caption: data.caption,
      storage_path: data.storagePath,
      media_mime: data.mime,
      taken_at: new Date().toISOString(),
      uploaded_by_name: data.uploadedByName,
      transcript: data.transcript ?? null,
    });
    if (error) throwSafe(error, "addMediaItem");
    return { id };
  });
