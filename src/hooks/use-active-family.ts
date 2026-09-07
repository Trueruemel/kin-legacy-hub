import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { listMyFamilies, type FamilySummary } from "@/lib/family.functions";

const STORAGE_KEY = "em.activeFamilyId";

/**
 * Real (backend) family membership of the signed-in user.
 * Returns `family: null` for the investor demo, which runs on mock state.
 */
export function useActiveFamily() {
  const list = useServerFn(listMyFamilies);
  const { signedIn, loading: authLoading } = useAuth();
  const [selected, setSelected] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
  );

  const query = useQuery<FamilySummary[]>({
    queryKey: ["my-families", signedIn],
    // Without a Supabase session the server fn rejects with "Unauthorized";
    // treat that as "no backend family" instead of surfacing an error page.
    queryFn: async () => {
      try {
        return await list();
      } catch {
        return [];
      }
    },
    enabled: signedIn && !authLoading,
    retry: false,
  });

  const families = query.data ?? [];
  const family = families.find((f) => f.id === selected) ?? families[0] ?? null;

  const setFamily = useCallback((id: string) => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
    setSelected(id);
  }, []);

  return { family, families, setFamily, loading: query.isLoading, error: query.error };
}
