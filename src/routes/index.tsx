import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, LockKeyhole, Users2 } from "lucide-react";
import { useState } from "react";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { photo, photoPool } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eternal — Memories — Your family's story, preserved forever" },
      {
        name: "description",
        content:
          "A private, invite-only home for your family's photos, stories, recipes and time-locked legacy messages across generations.",
      },
      { property: "og:title", content: "Eternal — Memories — Your family's story, preserved forever" },
      {
        property: "og:description",
        content: "Private family feed, living family tree, media archive and legacy vault in one secure place.",
      },
    ],
  }),
  component: LandingPage,
});

const marketing = [
  { icon: Users2, title: "A living family tree", text: "Four generations, one canvas — every branch clickable, every story attached." },
  { icon: Heart, title: "Memories that stay warm", text: "A private feed built for grandparents and grandchildren alike." },
  { icon: LockKeyhole, title: "Time-locked legacy vault", text: "Seal letters and videos to open on a birthday, a wedding, or after you're gone." },
];

function LandingPage() {
  const navigate = useNavigate();
  const signIn = useAppStore((s) => s.signIn);
  const [loading, setLoading] = useState(false);

  const enter = () => {
    setLoading(true);
    signIn();
    setTimeout(() => void navigate({ to: "/feed" }), 500);
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy-deep lg:block">
        <img
          src={photo(photoPool[0]!, 1600)}
          alt="Four generations of a family gathered at a reunion table"
          className="absolute inset-0 size-full object-cover opacity-35"
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Wordmark variant="dark" />
          <div className="max-w-lg">
            <h1 className="font-display text-5xl leading-tight font-semibold">
              Your family's story, preserved forever.
            </h1>
            <p className="mt-4 text-lg text-white/75">
              Private by design. Invite-only. Built so the youngest and the oldest in your family can
              both find their way around.
            </p>
            <ul className="mt-10 space-y-5">
              {marketing.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-display text-lg font-medium">{title}</span>
                    <span className="block text-sm text-white/65">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/40">
            "The Johnsons have shared 2,847 memories since 1952." — Investor demo dataset
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Wordmark className="text-primary dark:text-gold" />
            <p className="mt-6 font-display text-3xl font-semibold">
              Your family's story, preserved forever.
            </p>
          </div>

          <Card className="mt-8 p-6 lg:mt-0">
            <h2 className="font-display text-2xl font-semibold">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your family archive.
            </p>
            <div className="mt-6 space-y-3">
              <Button className="w-full" onClick={() => void navigate({ to: "/auth" })}>
                Sign in
              </Button>
              <Button
                variant="outline"
                className="w-full border-gold/60 text-foreground hover:bg-gold/10"
                onClick={() => void navigate({ to: "/auth" })}
              >
                Create your family archive
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={enter}
                disabled={loading}
              >
                {loading ? "Opening the demo…" : "Explore the demo archive"}
              </Button>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Invite-only. Every family controls its own archive.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
