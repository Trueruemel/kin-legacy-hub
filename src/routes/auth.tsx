import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { BETA_LOCKED, isBetaAllowed } from "@/lib/access";
import { AUTH_COPY } from "@/lib/eternal-copy";

import { supabase } from "@/integrations/supabase/client";

export function sanitizeNext(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { next?: string; denied?: boolean } => {
    const next = sanitizeNext(search["next"]);
    const denied = search["denied"] === true || search["denied"] === "true";
    return { ...(next ? { next } : {}), ...(denied ? { denied: true } : {}) };
  },

  head: () => ({
    meta: [
      { title: "Sign in — Eternal — Memories" },
      {
        name: "description",
        content:
          "Sign in or create your account to open your family's private archive of photos, stories and time-locked legacy messages.",
      },
      { property: "og:title", content: "Sign in — Eternal — Memories" },
      {
        property: "og:description",
        content: "Private, invite-only access to your family's living archive.",
      },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const navigate = useNavigate();
  const { next, denied } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const confirmationRedirect = () => `${window.location.origin}${next ?? "/feed"}`;

  const resendConfirmation = async (address: string) => {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: address,
      options: { emailRedirectTo: confirmationRedirect() },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("We sent the confirmation link again. Please check your inbox.");
  };

  const sendPasswordReset = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent. Please check your inbox.");
  };

  const afterAuth = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user && !isBetaAllowed(data.user.email)) {
      await supabase.auth.signOut();
      toast.error("This is a closed preview — please use one of the accounts we prepared for you.");
      await navigate({ to: "/auth", search: { denied: true } });
      return;
    }
    if (next) {
      window.location.href = next;
      return;
    }
    await navigate({ to: "/onboarding" });
  };

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void afterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, next]);

  const signInWithGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again or use your email.");
      return;
    }
    if (result.redirected) return;
    await afterAuth();
  };

  const signIn = async () => {
    setBusy(true);
    setNeedsConfirmation(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      const unconfirmed =
        (error as { code?: string }).code === "email_not_confirmed" ||
        /not confirmed/i.test(error.message);
      if (unconfirmed) {
        setNeedsConfirmation(true);
        toast.error("Your email address isn't confirmed yet. Please open the link we sent you.");
        return;
      }
      toast.error(error.message);
      return;
    }
    await afterAuth();
  };

  const signUp = async () => {
    if (password.length < 8) {
      toast.error("Please choose a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        // `next` is already restricted to an internal path by `sanitizeNext`.
        emailRedirectTo: confirmationRedirect(),
        data: { display_name: displayName },
      },
    });
    setBusy(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    // With email confirmation switched on, sign-up returns no session. Sending
    // the person to a protected page would bounce them straight back here, so
    // we show a "check your inbox" screen instead.
    if (!result.data?.session) {
      setAwaitingConfirmation(email);
      return;
    }
    toast.success("Account created.");
    await afterAuth();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-block">
          <Wordmark className="text-primary dark:text-gold" />
        </Link>

        <h1 className="mt-6 font-display text-2xl font-semibold">{AUTH_COPY.signInTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your family's private archive of memories, stories and heirlooms. {AUTH_COPY.footnote}
        </p>

        {BETA_LOCKED && !denied && (
          <p className="mt-4 rounded-lg border border-border bg-muted/60 p-3 text-sm text-muted-foreground">
            {AUTH_COPY.closedPreview}
          </p>
        )}

        {awaitingConfirmation && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm text-foreground"
          >
            <p className="font-medium">Almost there — please confirm your email</p>
            <p className="mt-1 text-muted-foreground">
              We sent a confirmation link to {awaitingConfirmation}. Open it and you can sign in
              right away.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              disabled={busy}
              onClick={() => void resendConfirmation(awaitingConfirmation)}
            >
              Send the link again
            </Button>
          </div>
        )}

        {needsConfirmation && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm text-foreground"
          >
            <p>
              Your email address isn't confirmed yet. Open the link we sent you, or request a new
              one.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              disabled={busy || !email}
              onClick={() => void resendConfirmation(email)}
            >
              Send the confirmation link again
            </Button>
          </div>
        )}

        {denied && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-foreground"
          >
            This is a closed preview. Only the accounts we prepared for you can open the archive
            right now — please sign in with one of those.
          </p>
        )}

        <Card className="mt-8 p-6">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => void signInWithGoogle()}
          >
            Continue with Google
          </Button>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or use email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <h2 className="font-display text-xl font-semibold">Welcome back</h2>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void signIn();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Opening the archive…" : "Sign in"}
                </Button>
              </form>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-4"
                disabled={busy}
                onClick={() => void sendPasswordReset()}
              >
                Forgot your password?
              </button>
            </TabsContent>


            <TabsContent value="signup" className="mt-6 space-y-4">
              <h2 className="font-display text-xl font-semibold">{AUTH_COPY.signUpTitle}</h2>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void signUp();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-up">Password</Label>
                  <Input
                    id="password-up"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating your account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Invite-only. Every family controls its own archive.
          </p>
        </Card>
      </div>
    </div>
  );
}
