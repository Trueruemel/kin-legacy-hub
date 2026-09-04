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
import { supabase } from "@/integrations/supabase/client";


function sanitizeNext(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { next?: string; denied?: boolean } => {
    const next = sanitizeNext(search['next']);
    const denied = search['denied'] === true || search['denied'] === "true";
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

function AuthPage() {
  const navigate = useNavigate();
  const { next, denied } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await afterAuth();
  };

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/feed`,
        data: { display_name: displayName },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. Check your inbox if confirmation is required.");
    await afterAuth();
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-block">
          <Wordmark className="text-primary dark:text-gold" />
        </Link>

        <h1 className="mt-6 font-display text-2xl font-semibold">
          Sign in to Eternal — Memories
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your family's private archive of memories, stories and heirlooms.
        </p>

        {denied && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-foreground"
          >
            This is a closed preview. Only the accounts we prepared for you can open the archive right
            now — please sign in with one of those.
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
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or use email</span>
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
                  <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Opening the archive…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6 space-y-4">
              <h2 className="font-display text-2xl font-semibold">Start your archive</h2>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void signUp();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-up">Email</Label>
                  <Input id="email-up" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-up">Password</Label>
                  <Input id="password-up" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
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
