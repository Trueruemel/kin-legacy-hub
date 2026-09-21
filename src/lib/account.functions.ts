import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DeleteAccountResult = { ok: true } | { blocked: string };

/**
 * Closes the signed-in person's own account for good. A family owner has to
 * hand ownership to somebody else first, so no family is left without a
 * caretaker and nobody loses access to shared memories.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeleteAccountResult> => {
    const { supabase, userId } = context;

    const { data: myMemberships, error } = await supabase
      .from("family_members")
      .select("family_id, role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);

    for (const membership of myMemberships ?? []) {
      if (membership.role !== "owner") continue;

      const { data: siblings } = await supabase
        .from("family_members")
        .select("user_id, role")
        .eq("family_id", membership.family_id);

      const others = (siblings ?? []).filter((m) => m.user_id !== userId);
      const otherOwners = others.filter((m) => m.role === "owner");
      if (others.length > 0 && otherOwners.length === 0) {
        const { data: family } = await supabase
          .from("families")
          .select("name")
          .eq("id", membership.family_id)
          .maybeSingle();
        return {
          blocked: `You are the only owner of ${
            family?.name ?? "one of your families"
          }. Make someone else an owner first, then you can close your account.`,
        };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    return { ok: true };
  });
