import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyProfile = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  locale: string | null;
  email: string | null;
};

/** The signed-in user's profile row plus their auth email. */
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile> => {
    const { supabase, userId, claims } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, locale")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: userId,
      displayName: data?.display_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
      locale: data?.locale ?? null,
      email: typeof claims["email"] === "string" ? (claims["email"] as string) : null,
    };
  });

/** Updates the signed-in user's profile. */
export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        displayName: z.string().trim().min(1).max(80).optional(),
        avatarUrl: z.string().trim().url().max(600).nullable().optional(),
        locale: z.string().trim().max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.displayName !== undefined) patch["display_name"] = data.displayName;
    if (data.avatarUrl !== undefined) patch["avatar_url"] = data.avatarUrl;
    if (data.locale !== undefined) patch["locale"] = data.locale;

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...patch }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Renames a family or updates its description (owners and stewards). */
export const updateFamily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(400).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("families")
      .update({ name: data.name, description: data.description ?? null })
      .eq("id", data.familyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Changes a member's role. Owners only; the last owner cannot be demoted. */
export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["owner", "steward", "member", "viewer"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: members, error: readError } = await supabase
      .from("family_members")
      .select("user_id, role")
      .eq("family_id", data.familyId);
    if (readError) throw new Error(readError.message);

    const owners = (members ?? []).filter((m) => m.role === "owner");
    const target = (members ?? []).find((m) => m.user_id === data.userId);
    const callerIsOwner = (members ?? []).some((m) => m.user_id === userId && m.role === "owner");
    if (!target) throw new Error("That person is not in this family.");
    if ((data.role === "owner" || target.role === "owner") && !callerIsOwner) {
      throw new Error("Only the family owner can hand over or take away ownership.");
    }
    if (target.role === "owner" && data.role !== "owner" && owners.length <= 1) {
      throw new Error("A family needs at least one owner. Promote someone else first.");
    }

    const { error } = await supabase
      .from("family_members")
      .update({ role: data.role })
      .eq("family_id", data.familyId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Removes a member from a family, or lets the caller leave it. */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ familyId: z.string().uuid(), userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: members, error: readError } = await supabase
      .from("family_members")
      .select("user_id, role")
      .eq("family_id", data.familyId);
    if (readError) throw new Error(readError.message);

    const owners = (members ?? []).filter((m) => m.role === "owner");
    const target = (members ?? []).find((m) => m.user_id === data.userId);
    const callerIsOwner = (members ?? []).some((m) => m.user_id === userId && m.role === "owner");
    if (!target) return { ok: true };
    if (target.role === "owner" && data.userId !== userId && !callerIsOwner) {
      throw new Error("Only the family owner can remove another owner.");
    }
    if (target.role === "owner" && owners.length <= 1) {
      throw new Error("The last owner cannot leave. Hand ownership over first.");
    }

    const { error } = await supabase
      .from("family_members")
      .delete()
      .eq("family_id", data.familyId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
