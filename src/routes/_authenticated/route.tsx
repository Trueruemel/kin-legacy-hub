import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { isBetaAllowed } from "@/lib/access";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // The investor demo runs entirely on in-memory mock data and never
      // touches the backend, so it may enter without a real account.
      if (useAppStore.getState().signedIn) return { user: null };
      // Keep the requested page (invite link, family page, event…) so we can
      // send the person there right after signing in.
      throw redirect({ to: "/auth", search: { next: location.href } });
    }
    // Closed beta: only the developer/demo accounts may open the app.
    if (!isBetaAllowed(data.user.email)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { denied: true, next: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
