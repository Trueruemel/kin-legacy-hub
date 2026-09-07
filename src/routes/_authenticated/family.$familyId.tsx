import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Images, MapPin, Sparkles, Users2 } from "lucide-react";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFamilyOverview } from "@/lib/dashboard.functions";
import { listFamilyMembers } from "@/lib/members.functions";

export const Route = createFileRoute("/_authenticated/family/$familyId")({
  head: () => ({
    meta: [
      { title: "Family Profile — Eternal — Memories" },
      {
        name: "description",
        content:
          "The profile page of one family: who has joined, the newest photos in the archive and the gatherings coming up next.",
      },
      { property: "og:title", content: "Family Profile — Eternal — Memories" },
      {
        property: "og:description",
        content: "Members, photos and upcoming events of a single family archive.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FamilyProfilePage,
});

function FamilyProfilePage() {
  const { familyId } = Route.useParams();
  const loadOverview = useServerFn(getFamilyOverview);
  const loadMembers = useServerFn(listFamilyMembers);

  const overview = useQuery({
    queryKey: ["family-overview", familyId],
    queryFn: () => loadOverview({ data: { familyId } }),
    retry: false,
  });
  const members = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => loadMembers({ data: { familyId } }),
    retry: false,
  });

  const data = overview.data;

  if (overview.isError) {
    return (
      <AppLayout>
        <PageHeader title="Family profile" description="This family archive could not be opened." />
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You are not a member of this family, or the link is no longer valid.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/dashboard">Back to your dashboard</Link>
          </Button>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout wide>
      <PageHeader
        title={data ? data.familyName : "Family profile"}
        description="Everyone who has joined, the newest photos and the next gatherings — all on one page."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/members">Manage members</Link>
            </Button>
            <Button asChild>
              <Link to="/tree">Open family tree</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Members joined", value: data?.counts.members, icon: Users2 },
          { label: "People in the tree", value: data?.counts.persons, icon: Users2 },
          { label: "Photos & media", value: data?.counts.photos, icon: Images },
          { label: "Upcoming events", value: data?.counts.upcomingEvents, icon: CalendarDays },
          { label: "Stories shared", value: data?.counts.stories, icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="h-full p-5">
            <Icon className="size-4 text-gold" />
            <p className="mt-3 font-display text-3xl font-semibold">{value ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-display text-xl font-semibold">Members of this family</h2>
          {members.isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">Loading members…</p>
          )}
          {members.data && members.data.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Nobody else has joined yet.</p>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(members.data ?? []).map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Avatar className="size-10">
                  {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                  <AvatarFallback>{m.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {m.name}
                    {m.isMe && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                </span>
                <Link
                  to="/profile/$userId"
                  params={{ userId: m.userId }}
                  className="text-xs font-medium text-primary underline-offset-4 hover:underline dark:text-gold"
                >
                  Profile
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Coming up</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/calendar">Calendar</Link>
            </Button>
          </div>
          {data && data.events.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Nothing planned yet.</p>
          )}
          <ul className="mt-4 space-y-3">
            {(data?.events ?? []).map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3">
                <Badge variant="secondary" className="capitalize">
                  {e.category}
                </Badge>
                <p className="mt-2 text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.startsAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {e.location && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {e.location}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Photos in this archive</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/gallery">Open gallery</Link>
          </Button>
        </div>
        {data && data.photos.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No photos uploaded yet.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(data?.photos ?? []).map((p) =>
            p.url ? (
              <img
                key={p.id}
                src={p.url}
                alt={p.caption}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-lg object-cover"
              />
            ) : null,
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
