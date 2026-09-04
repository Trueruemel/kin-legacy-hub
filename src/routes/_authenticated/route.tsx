import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { isBetaAllowed } from "@/lib/access";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // The investor demo runs entirely on in-memory mock data and never
      // touches the backend, so it may enter without a real account.
      if (useAppStore.getState().signedIn) return { user: null };
      throw redirect({ to: "/auth" });
    }
    // Closed beta: only the developer/demo accounts may open the app.
    if (!isBetaAllowed(data.user.email)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { denied: true } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
