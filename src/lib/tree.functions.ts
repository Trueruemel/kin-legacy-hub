import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TreePerson = {
  id: string;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthPlace: string | null;
  bio: string | null;
};

export type TreeRelationship = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: "parent" | "partner";
};

/** Everyone recorded in the family tree plus their relationships. */
export const listTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ persons: TreePerson[]; relationships: TreeRelationship[] }> => {
      const { supabase } = context;
      const [{ data: persons, error }, { data: rels, error: relError }] = await Promise.all([
        supabase
          .from("persons")
          .select("id, first_name, last_name, birth_date, death_date, birth_place, bio")
          .eq("family_id", data.familyId)
          .order("birth_date", { ascending: true, nullsFirst: false }),
        supabase
          .from("relationships")
          .select("id, from_person_id, to_person_id, type")
          .eq("family_id", data.familyId),
      ]);
      if (error) throw new Error(error.message);
      if (relError) throw new Error(relError.message);

      return {
        persons: (persons ?? []).map((p) => ({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          birthDate: p.birth_date,
          deathDate: p.death_date,
          birthPlace: p.birth_place,
          bio: p.bio,
        })),
        relationships: (rels ?? []).map((r) => ({
          id: r.id,
          fromPersonId: r.from_person_id,
          toPersonId: r.to_person_id,
          type: r.type,
        })),
      };
    },
  );

/** Adds a person to the family tree. */
export const addPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().max(80).optional(),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        deathDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        birthPlace: z.string().trim().max(120).optional(),
        bio: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("persons").insert({
      family_id: data.familyId,
      first_name: data.firstName,
      last_name: data.lastName || null,
      birth_date: data.birthDate || null,
      death_date: data.deathDate || null,
      birth_place: data.birthPlace || null,
      bio: data.bio || null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Links two people as parent→child or as partners. */
export const addRelationship = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        fromPersonId: z.string().uuid(),
        toPersonId: z.string().uuid(),
        type: z.enum(["parent", "partner"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.fromPersonId === data.toPersonId) throw new Error("Pick two different people.");
    const { error } = await context.supabase.from("relationships").insert({
      family_id: data.familyId,
      from_person_id: data.fromPersonId,
      to_person_id: data.toPersonId,
      type: data.type,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Stores a cropped portrait for a person in the tree. */
export const setPersonPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        personId: z.string().uuid(),
        storagePath: z.string().min(3).max(400),
        mime: z.string().min(3).max(120),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("persons")
      .update({ photo_path: data.storagePath, updated_at: new Date().toISOString() })
      .eq("id", data.personId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
