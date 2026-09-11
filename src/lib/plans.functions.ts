import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FamilyPlan = {
  familyId: string;
  familyName: string;
  isPaid: boolean;
  nextPaymentAt: string | null;
  stopsAtPeriodEnd: boolean;
};

/** Which of my families are on a paid plan, and when their next payment is due. */
export const getFamilyPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ environment: z.enum(["sandbox", "live"]).default("live") })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<FamilyPlan[]> => {
    const { supabase, userId } = context;

    const { data: memberships } = await supabase
      .from("family_members")
      .select("family_id, families(id, name)")
      .eq("user_id", userId);

    const families = (memberships ?? [])
      .map((m) => {
        const f = m.families as unknown as { id: string; name: string } | null;
        return f ? { id: f.id, name: f.name } : null;
      })
      .filter((f): f is { id: string; name: string } => !!f);

    const plans = await Promise.all(
      families.map(async (family) => {
        const { data: status } = await supabase.rpc("family_plan_status", {
          _family_id: family.id,
          _env: data.environment,
        });
        const row = (Array.isArray(status) ? status[0] : status) as
          | {
              is_paid: boolean | null;
              next_payment_at: string | null;
              cancel_at_period_end: boolean | null;
            }
          | undefined;

        return {
          familyId: family.id,
          familyName: family.name,
          isPaid: !!row?.is_paid,
          nextPaymentAt: row?.next_payment_at ?? null,
          stopsAtPeriodEnd: !!row?.cancel_at_period_end,
        };
      }),
    );

    return plans.sort((a, b) => Number(b.isPaid) - Number(a.isPaid));
  });
