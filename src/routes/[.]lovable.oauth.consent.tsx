import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type OAuthNamespace = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

type AuthorizationDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search['authorization_id'] === "string" ? search['authorization_id'] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.searchStr).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-xl font-semibold">Connection request unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

const AREAS = [
  { key: "tree" as const, label: "Family tree", hint: "Names, birth dates and places of the people in your tree." },
  { key: "photos" as const, label: "Photos", hint: "Captions and details of photos in your gallery." },
  { key: "events" as const, label: "Calendar & events", hint: "Upcoming gatherings, and adding new ones for you." },
];

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState({ tree: true, photos: false, events: true });
  const clientName = details?.client?.name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);

    if (approve) {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (uid) {
        const { error: saveError } = await supabase.from("assistant_scopes").upsert(
          {
            user_id: uid,
            allow_tree: areas.tree,
            allow_photos: areas.photos,
            allow_events: areas.events,
          },
          { onConflict: "user_id" },
        );
        if (saveError) {
          setBusy(false);
          setError(saveError.message);
          return;
        }
      }
    }

    const { data, error: decideError } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (decideError) {
      setBusy(false);
      setError(decideError.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect was returned. Please start the connection again.");
      return;
    }
    window.location.href = target;
  }

  const nothingAllowed = !areas.tree && !areas.photos && !areas.events;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md">
        <Wordmark className="text-primary dark:text-gold" />
        <h1 className="mt-6 font-display text-2xl font-semibold">Connect {clientName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName} is asking to work with your family archive on your behalf. Choose what it may
          see. You can change this the next time you connect, and disconnect at any time.
        </p>
        <Card className="mt-8 space-y-5 p-6">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">What {clientName} may access</legend>
            {AREAS.map((area) => (
              <div key={area.key} className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor={`area-${area.key}`} className="text-sm font-medium">
                    {area.label}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">{area.hint}</p>
                </div>
                <Switch
                  id={`area-${area.key}`}
                  checked={areas[area.key]}
                  disabled={busy}
                  onCheckedChange={(checked) =>
                    setAreas((prev) => ({ ...prev, [area.key]: checked }))
                  }
                />
              </div>
            ))}
          </fieldset>

          <p className="text-xs text-muted-foreground">
            Nothing else is shared. Your vault, messages and anything a relative has hidden from you
            stay out of reach.
          </p>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="space-y-3">
            <Button
              className="w-full"
              disabled={busy || nothingAllowed}
              onClick={() => void decide(true)}
            >
              {nothingAllowed ? "Choose at least one area" : "Allow access"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void decide(false)}
            >
              Deny
            </Button>
          </div>
          <p aria-live="polite" className="sr-only">
            {busy ? "Sending your decision…" : ""}
          </p>
        </Card>
      </div>
    </main>
  );
}
