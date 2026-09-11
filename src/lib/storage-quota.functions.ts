import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FamilyStorage = {
  usedBytes: number;
  limitBytes: number;
  extraActive: boolean;
};

/** How much room a family has, including any active extra-storage purchase. */
export const getFamilyStorage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        environment: z.enum(["sandbox", "live"]).default("live"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<FamilyStorage> => {
    const { supabase } = context;

    const [limit, usage] = await Promise.all([
      supabase.rpc("family_storage_limit_bytes", {
        _family_id: data.familyId,
        _env: data.environment,
      }),
      supabase.rpc("family_storage_usage_bytes", { _family_id: data.familyId }),
    ]);

    const baseBytes = 5 * 1024 * 1024 * 1024;
    const limitBytes = Number(limit.data ?? baseBytes);
    const usedBytes = Number(usage.data ?? 0);

    return {
      usedBytes,
      limitBytes,
      extraActive: limitBytes > baseBytes,
    };
  });
