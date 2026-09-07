import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

export type Areas = { tree: boolean; photos: boolean; events: boolean };

export type MemberVisibilityRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "steward" | "member" | "viewer";
  isMe: boolean;
  areas: Areas;
  /** Owners and stewards always see everything, so their switches are locked on. */
  locked: boolean;
};

const areasSchema = z.object({ tree: z.boolean(), photos: z.boolean(), events: z.boolean() });

/** Every relative in the family with their tree / photos / events switches. */
export const listMemberVisibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<MemberVisibilityRow[]> => {
    const { supabase, userId } = context;
    const { data: members, error } = await supabase
      .from("family_members")
      .select("user_id, role")
      .eq("family_id", data.familyId);
    if (error) throwSafe(error, "listMemberVisibility");
    if (!members || members.length === 0) return [];

    const ids = members.map((m) => m.user_id);
    const [{ data: profiles }, { data: rules }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids),
      supabase
        .from("member_visibility")
        .select("member_user_id, allow_tree, allow_photos, allow_events")
        .eq("family_id", data.familyId),
    ]);

    return members.map((m) => {
      const profile = profiles?.find((p) => p.id === m.user_id);
      const rule = rules?.find((r) => r.member_user_id === m.user_id);
      const locked = m.role === "owner" || m.role === "steward";
      return {
        userId: m.user_id,
        name: profile?.display_name ?? "Family member",
        avatarUrl: profile?.avatar_url ?? null,
        role: m.role,
        isMe: m.user_id === userId,
        locked,
        areas: locked
          ? { tree: true, photos: true, events: true }
          : {
              tree: rule?.allow_tree ?? true,
              photos: rule?.allow_photos ?? true,
              events: rule?.allow_events ?? true,
            },
      };
    });
  });

/** Save the switches for one relative. Only owners and stewards pass the access rules. */
export const setMemberVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        memberUserId: z.string().uuid(),
        areas: areasSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("member_visibility").upsert(
      {
        family_id: data.familyId,
        member_user_id: data.memberUserId,
        allow_tree: data.areas.tree,
        allow_photos: data.areas.photos,
        allow_events: data.areas.events,
      },
      { onConflict: "family_id,member_user_id" },
    );
    if (error) throwSafe(error, "setMemberVisibility");
    return { ok: true };
  });

/** What connected AI assistants may read for the signed-in person. */
export const getAssistantScopes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Areas> => {
    const { data, error } = await context.supabase
      .from("assistant_scopes")
      .select("allow_tree, allow_photos, allow_events")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throwSafe(error, "getAssistantScopes");
    return {
      tree: data?.allow_tree ?? true,
      photos: data?.allow_photos ?? false,
      events: data?.allow_events ?? true,
    };
  });

export const setAssistantScopes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ areas: areasSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("assistant_scopes").upsert(
      {
        user_id: context.userId,
        allow_tree: data.areas.tree,
        allow_photos: data.areas.photos,
        allow_events: data.areas.events,
      },
      { onConflict: "user_id" },
    );
    if (error) throwSafe(error, "setAssistantScopes");
    return { ok: true };
  });
