import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a new password — Eternal — Memories" },
      {
        name: "description",
        content:
          "Set a new password for your Eternal — Memories account and get back into your family's private archive.",
      },
      { property: "og:title", content: "Choose a new password — Eternal — Memories" },
      {
        property: "og:description",
        content: "Set a new password and return to your family's private archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [linkValid, setLinkValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // The link from the email signs the person in just long enough to choose a
  // new password. Wait for that session before showing the form.
  useEffect(() => {
    let settled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        settled = true;
        setLinkValid(true);
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setLinkValid(true);
      }
      setReady(true);
    });

    // A link that was already used or has expired never produces a session.
    const timer = window.setTimeout(() => {
      if (!settled) setReady(true);
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const save = async () => {
    if (password.length < 8) {
      toast.error("Please choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Your password has been changed. Welcome back.");
    await navigate({ to: "/onboarding" });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8 flex justify-center">
        <Wordmark />
      </div>
      <Card className="p-6">
        <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>

        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            One moment while we check your link…
          </p>
        ) : !linkValid ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              This reset link is no longer valid — it may already have been used or it has expired.
              You can ask for a new one from the sign-in page.
            </p>
            <Button asChild className="mt-5">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Pick something only you know. You will stay signed in afterwards.
            </p>
            <form
              className="mt-5 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-describedby="new-password-hint"
                />
                <p id="new-password-hint" className="text-xs text-muted-foreground">
                  At least 8 characters.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Repeat new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save new password"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
