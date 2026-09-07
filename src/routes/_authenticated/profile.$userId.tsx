import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CalendarDays, MapPin, MessageSquare, Sparkles } from "lucide-react";

import { AppLayout } from "@/components/app-layout";
import { MemoryCard } from "@/components/memory-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { age, lifeDates } from "@/lib/format";
import { mediaItems, relationships, users, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  loader: ({ params }) => {
    const person = users.find((u) => u.id === params.userId);
    if (!person) throw notFound();
    return { person };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Member not found — Eternal — Memories" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { person } = loaderData;
    const description = person.bio.slice(0, 150);
    return {
      meta: [
        { title: `${person.displayName} — Family Heritage Profile` },
        { name: "description", content: description },
        { property: "og:title", content: `${person.displayName} — Family Heritage Profile` },
        { property: "og:description", content: description },
        { property: "og:image", content: person.coverPhotoUrl },
        { name: "twitter:image", content: person.coverPhotoUrl },
      ],
    };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { person } = Route.useLoaderData();
  const memories = useAppStore((s) => s.memories).filter(
    (m) => m.authorId === person.id || m.taggedUserIds.includes(person.id),
  );
  const photos = mediaItems.filter((m) => m.uploadedBy === person.id).slice(0, 12);

  const parents = relationships
    .filter((r) => r.type === "parent" && r.to === person.id)
    .map((r) => userById(r.from));
  const children = relationships
    .filter((r) => r.type === "parent" && r.from === person.id)
    .map((r) => userById(r.to));
  const spouses = relationships
    .filter((r) => r.type === "spouse" && (r.from === person.id || r.to === person.id))
    .map((r) => userById(r.from === person.id ? r.to : r.from));

  return (
    <AppLayout wide>
      <div className="overflow-hidden rounded-xl border border-border">
        <img src={person.coverPhotoUrl} alt="" className="h-48 w-full object-cover sm:h-64" />
        <div className="flex flex-wrap items-end gap-4 bg-card p-5">
          <Avatar className="-mt-16 size-28 border-4 border-card ring-2 ring-gold/40">
            <AvatarImage src={person.avatarUrl} alt="" />
            <AvatarFallback>{person.firstName[0]}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {person.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {person.relationshipToViewer} · {lifeDates(person.birthDate, person.deathDate)} ·{" "}
              {person.status === "deceased"
                ? `lived ${age(person.birthDate, person.deathDate)} years`
                : `${age(person.birthDate)} years old`}
            </p>
            {person.location && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" /> {person.location}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {person.role.replace("_", " ")}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/messages">
                <MessageSquare className="size-4" /> Message
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <Tabs defaultValue="story">
            <TabsList>
              <TabsTrigger value="story">Life story</TabsTrigger>
              <TabsTrigger value="memories">Memories</TabsTrigger>
              <TabsTrigger value="photos">Photos</TabsTrigger>
            </TabsList>

            <TabsContent value="story" className="mt-4 space-y-4">
              <Card className="p-6">
                <h2 className="font-display text-xl font-semibold">About</h2>
                <Separator className="my-3" />
                <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                  {person.bio}
                </p>
              </Card>
              <Card className="p-6">
                <h2 className="font-display text-xl font-semibold">Timeline</h2>
                <Separator className="my-3" />
                <ol className="relative space-y-5 border-l border-gold/40 pl-6">
                  {person.lifeTimeline.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[1.9rem] top-1.5 size-2.5 rounded-full bg-gold" />
                      <p className="font-display text-lg font-semibold">
                        {ev.year} — {ev.title}
                      </p>
                      {ev.description && (
                        <p className="text-sm text-muted-foreground">{ev.description}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </Card>
            </TabsContent>

            <TabsContent value="memories" className="mt-4 space-y-5">
              {memories.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                  No memories yet.
                </Card>
              )}
              {memories.map((memory) => (
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </TabsContent>

            <TabsContent value="photos" className="mt-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <img
                    key={p.id}
                    src={p.url}
                    alt={p.caption}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
                {photos.length === 0 && (
                  <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">In numbers</h2>
            <Separator className="my-3" />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Memories", person.stats.memoriesShared],
                ["Photos", person.stats.photosUploaded],
                ["Vault items", person.stats.vaultItems],
                ["Children", person.stats.children],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{label as string}</dt>
                  <dd className="font-display text-xl font-semibold">{value as number}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">Family</h2>
            <Separator className="my-3" />
            {(
              [
                ["Parents", parents],
                ["Partner", spouses],
                ["Children", children],
              ] as const
            ).map(([label, list]) =>
              list.length ? (
                <div key={label} className="mb-4 last:mb-0">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <div className="space-y-2">
                    {list.map((rel) => (
                      <Link
                        key={rel.id}
                        to="/profile/$userId"
                        params={{ userId: rel.id }}
                        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted"
                      >
                        <Avatar className="size-8">
                          <AvatarImage src={rel.avatarUrl} alt="" />
                          <AvatarFallback>{rel.firstName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{rel.displayName}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </Card>

          <Card className="p-5">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold">
              <Sparkles className="size-4 text-gold" /> Legacy
            </h2>
            <Separator className="my-3" />
            <p className="text-sm text-muted-foreground">
              {person.stats.vaultItems} sealed item{person.stats.vaultItems === 1 ? "" : "s"}{" "}
              waiting in the vault.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/vault">
                <CalendarDays className="size-4" /> Open vault
              </Link>
            </Button>
          </Card>
        </aside>
      </div>
    </AppLayout>
  );
}
