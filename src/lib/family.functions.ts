import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

export type FamilySummary = {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "steward" | "member" | "viewer";
  isDemo: boolean;
};

/** Makes sure a profile row exists for the signed-in user. */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ displayName: z.string().trim().min(1).max(80).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", userId)
      .maybeSingle();

    const fallback =
      data.displayName ??
      (typeof claims["email"] === "string" ? (claims["email"] as string).split("@")[0] : null) ??
      "Family member";

    if (existing) {
      if (existing.display_name) return { id: existing.id, displayName: existing.display_name };
      const { data: filled, error: fillError } = await supabase
        .from("profiles")
        .update({ display_name: fallback })
        .eq("id", userId)
        .select("id, display_name")
        .single();
      if (fillError) throwSafe(fillError, "ensureProfile");
      return { id: filled.id, displayName: filled.display_name };
    }

    const { data: created, error } = await supabase
      .from("profiles")
      .insert({ id: userId, display_name: fallback })
      .select("id, display_name")
      .single();
    if (error) throwSafe(error, "ensureProfile");
    return { id: created.id, displayName: created.display_name };
  });

/** Families the signed-in user belongs to. */
export const listMyFamilies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FamilySummary[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("family_members")
      .select("role, family_id")
      .eq("user_id", userId);
    if (error) throwSafe(error, "listMyFamilies");

    const memberships = data ?? [];
    if (memberships.length === 0) return [];

    const { data: familyRows, error: familyError } = await supabase
      .from("families")
      .select("id, name, description, is_demo")
      .in(
        "id",
        memberships.map((m) => m.family_id),
      );
    if (familyError) throwSafe(familyError, "listMyFamilies");

    return (familyRows ?? []).flatMap((family) => {
      const membership = memberships.find((m) => m.family_id === family.id);
      if (!membership) return [];
      return [
        {
          id: family.id,
          name: family.name,
          description: family.description,
          role: membership.role,
          isDemo: family.is_demo,
        },
      ];
    });
  });

/** Creates a family and makes the caller its owner. */
export const createFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // No `.select()` here: the family SELECT policy only passes once the
    // creator is a member, so returning the row would fail the insert.
    const familyId = crypto.randomUUID();
    const { error } = await supabase.from("families").insert({
      id: familyId,
      name: data.name,
      description: data.description ?? null,
      created_by: userId,
    });
    if (error) throwSafe(error, "createFamily");

    const { error: memberError } = await supabase
      .from("family_members")
      .insert({ family_id: familyId, user_id: userId, role: "owner" });
    if (memberError) throwSafe(memberError, "createFamily");

    return { id: familyId, name: data.name };
  });
