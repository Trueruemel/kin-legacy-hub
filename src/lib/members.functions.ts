import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FamilyMemberRow = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: "owner" | "steward" | "member" | "viewer";
  isMe: boolean;
};

/** Everyone who has joined this family (accounts, not tree persons). */
export const listFamilyMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FamilyMemberRow[]> => {
    const { supabase, userId } = context;
    const { data: members, error } = await supabase
      .from("family_members")
      .select("user_id, role")
      .eq("family_id", data.familyId);
    if (error) throw new Error(error.message);
    if (!members || members.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in(
        "id",
        members.map((m) => m.user_id),
      );

    return members.map((m) => {
      const profile = profiles?.find((p) => p.id === m.user_id);
      return {
        userId: m.user_id,
        name: profile?.display_name ?? "Family member",
        avatarUrl: profile?.avatar_url ?? null,
        role: m.role,
        isMe: m.user_id === userId,
      };
    });
  });
