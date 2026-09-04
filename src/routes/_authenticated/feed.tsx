import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Cake, Image as ImageIcon, LockKeyhole, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { MemoryCard } from "@/components/memory-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { daysUntil, formatDate, nextBirthday, relativeTime } from "@/lib/format";
import {
  events as allEvents,
  families,
  photo,
  photoPool,
  userById,
  users,
  vaultItems,
} from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { RealFeed } from "@/components/feed-real";
import { useActiveFamily } from "@/hooks/use-active-family";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Family Feed — Eternal Memories" },
      { name: "description", content: "The living feed of your family's memories, photos and milestones." },
      { property: "og:title", content: "Family Feed — Eternal Memories" },
      { property: "og:description", content: "Every story your family shares, in one warm private place." },
    ],
  }),
  component: FeedPage,
});

function Composer() {
  const user = userById(useAppStore((s) => s.currentUserId));
  const addMemory = useAppStore((s) => s.addMemory);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <Card className="paper-edge p-4">
      <div className="flex gap-3">
        <Avatar className="size-10">
          <AvatarImage src={user.avatarUrl} alt="" />
          <AvatarFallback>{user.firstName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a memory with your family…"
            aria-label="Share a memory"
            className="min-h-20 resize-none border-none bg-muted/60 text-[15px] focus-visible:ring-1"
          />
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-1">
              {photos.map((p) => (
                <img key={p} src={p} alt="" loading="lazy" className="aspect-4/3 w-full rounded-md object-cover" />
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setPhotos((p) => [...p, photo(photoPool[(p.length * 3 + 2) % photoPool.length]!, 900)])
                }
              >
                <ImageIcon className="size-4" /> Photo
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast("Tagging is part of the full product")}>
                <Sparkles className="size-4" /> Tag family
              </Button>
              <Button variant="ghost" size="sm" onClick={() => toast("Location picker coming soon")}>
                <MapPin className="size-4" /> Place
              </Button>
            </div>
            <Button
              size="sm"
              disabled={!text.trim()}
              onClick={() => {
                addMemory({ text: text.trim(), photos });
                setText("");
                setPhotos([]);
                toast.success("Memory shared with your family");
              }}
            >
              Share memory
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function FeedPage() {
  const { family, loading } = useActiveFamily();
  if (loading) {
    return (
      <AppLayout wide>
        <p className="py-24 text-center text-sm text-muted-foreground">Loading your family…</p>
      </AppLayout>
    );
  }
  if (family) {
    return (
      <AppLayout wide>
        <RealFeed familyId={family.id} familyName={family.name} />
      </AppLayout>
    );
  }
  return <DemoFeed />;
}

function DemoFeed() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const memories = useAppStore((s) => s.memories).filter((m) => m.familyId === familyId);
  const family = families.find((f) => f.id === familyId)!;
  const familyUsers = users.filter((u) => u.familyId === familyId);
  const living = familyUsers.filter((u) => u.status === "living");

  const upcomingBirthdays = living
    .map((u) => ({ user: u, days: daysUntil(nextBirthday(u.birthDate).toISOString()) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const upcomingEvents = allEvents
    .filter((e) => e.familyId === familyId)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const familyVault = vaultItems.filter((v) => v.familyId === familyId);
  const onThisDay = memories.slice(6, 8);

  return (
    <AppLayout wide>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="mx-auto w-full max-w-[42rem] space-y-4">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={family.coverPhotoUrl}
              alt={`${family.name} gathered together`}
              className="h-40 w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-navy-deep/85 to-transparent" />
            <div className="absolute bottom-4 left-5 text-white">
              <h1 className="font-display text-2xl font-semibold">{family.name}</h1>
              <p className="text-sm text-white/75">
                Since {family.foundedYear} · {familyUsers.length} members · {memories.length} memories
              </p>
            </div>
          </div>

          <Composer />

          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>

        <aside className="hidden space-y-4 xl:block">
          <div className="sticky top-22 space-y-4">
            <Card className="p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Cake className="size-4 text-gold" /> Upcoming birthdays
              </h2>
              <Separator className="my-3" />
              <ul className="space-y-3">
                {upcomingBirthdays.map(({ user, days }) => (
                  <li key={user.id}>
                    <Link
                      to="/profile/$userId"
                      params={{ userId: user.id }}
                      className="flex items-center gap-3 text-sm hover:underline"
                    >
                      <Avatar className="size-8">
                        <AvatarImage src={user.avatarUrl} alt="" />
                        <AvatarFallback>{user.firstName[0]}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate">{user.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {days === 0 ? "Today" : `${days}d`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <CalendarDays className="size-4 text-gold" /> Upcoming events
              </h2>
              <Separator className="my-3" />
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      to="/events/$eventId"
                      params={{ eventId: event.id }}
                      className="block rounded-lg p-2 -m-2 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="block font-medium">{event.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(event.date)} · {event.location}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <LockKeyhole className="size-4 text-gold" /> Legacy Vault
              </h2>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">
                {familyVault.length} sealed items waiting for their moment.
              </p>
              <Link to="/vault">
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  Open the vault
                </Button>
              </Link>
            </Card>

            <Card className="p-4">
              <h2 className="font-display text-base font-semibold">On this day</h2>
              <Separator className="my-3" />
              <ul className="space-y-3">
                {onThisDay.map((m) => (
                  <li key={m.id} className="flex gap-3">
                    {m.photos[0] && (
                      <img src={m.photos[0]} alt="" loading="lazy" className="size-12 rounded-md object-cover" />
                    )}
                    <span className="min-w-0 flex-1 text-xs">
                      <span className="line-clamp-2 text-foreground/85">{m.text}</span>
                      <span className="mt-1 block text-muted-foreground">{relativeTime(m.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <h2 className="font-display text-base font-semibold">Family snapshot</h2>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  ["Members", familyUsers.length],
                  ["Memories", memories.length],
                  ["Generations", 4],
                  ["Vault items", familyVault.length],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-muted/60 py-3">
                    <p className="font-display text-xl font-semibold text-gold">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <Badge variant="secondary" className="mt-3 w-full justify-center">
                {family.subscription} plan
              </Badge>
            </Card>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
