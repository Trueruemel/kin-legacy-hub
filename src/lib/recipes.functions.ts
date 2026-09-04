import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RecipeRow = {
  id: string;
  title: string;
  description: string | null;
  ingredients: string[];
  instructions: string[];
  attributedTo: string | null;
  photoUrl: string | null;
  createdAt: string;
};

/** Family recipes, with signed URLs for privately stored photos. */
export const listRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<RecipeRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("recipes")
      .select(
        "id, title, description, ingredients, instructions, attributed_to, photo_url, storage_path, created_at",
      )
      .eq("family_id", data.familyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const paths = (rows ?? []).map((r) => r.storage_path).filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      const { data: urls } = await supabase.storage.from("memories").createSignedUrls(paths, 900);
      for (const entry of urls ?? []) {
        if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
      }
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      ingredients: r.ingredients ?? [],
      instructions: r.instructions ?? [],
      attributedTo: r.attributed_to,
      photoUrl: r.storage_path ? (signed.get(r.storage_path) ?? null) : r.photo_url,
      createdAt: r.created_at,
    }));
  });

/** Saves a new family recipe. */
export const createRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        title: z.string().trim().min(2).max(140),
        description: z.string().trim().max(1200).optional(),
        ingredients: z.array(z.string().trim().min(1).max(200)).min(1).max(60),
        instructions: z.array(z.string().trim().min(1).max(1200)).min(1).max(60),
        attributedTo: z.string().trim().max(90).optional(),
        storagePath: z.string().min(3).max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const id = crypto.randomUUID();
    const { error } = await context.supabase.from("recipes").insert({
      id,
      family_id: data.familyId,
      title: data.title,
      description: data.description ?? null,
      ingredients: data.ingredients,
      instructions: data.instructions,
      attributed_to: data.attributedTo ?? null,
      storage_path: data.storagePath ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { id };
  });

/** Removes a recipe. */
export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ recipeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("recipes").delete().eq("id", data.recipeId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
