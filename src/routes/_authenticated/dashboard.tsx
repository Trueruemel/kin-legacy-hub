import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Images, MapPin, Sparkles, Users2 } from "lucide-react";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActiveFamily } from "@/hooks/use-active-family";
import { getFamilyOverview } from "@/lib/dashboard.functions";
import { getFamilyPlans } from "@/lib/plans.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Family Dashboard — Eternal — Memories" },
      {
        name: "description",
        content:
          "See who is in your family tree, which photos are archived and which gatherings are coming up — all on one page.",
      },
      { property: "og:title", content: "Family Dashboard — Eternal — Memories" },
      {
        property: "og:description",
        content: "Your family at a glance: people, photos and upcoming events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { family, loading } = useActiveFamily();

  if (loading) {
    return (
      <AppLayout>
        <p className="py-24 text-center text-sm text-muted-foreground">
          Opening your family dashboard…
        </p>
      </AppLayout>
    );
  }

  if (!family) {
    return (
      <AppLayout>
        <PageHeader
          title="Family Dashboard"
          description="Set up your family archive to see people, photos and events here."
        />
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            You are viewing the demo archive. Create your own family to get a live dashboard.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/setup">Start the family setup</Link>
          </Button>
        </Card>
      </AppLayout>
    );
  }

  return <Overview familyId={family.id} />;
}

function Overview({ familyId }: { familyId: string }) {
  const load = useServerFn(getFamilyOverview);
  const query = useQuery({
    queryKey: ["family-overview", familyId],
    queryFn: () => load({ data: { familyId } }),
  });
  const data = query.data;

  return (
    <AppLayout wide>
      <PageHeader
        title={data ? `${data.familyName} at a glance` : "Family Dashboard"}
        description="Who is in your tree, what has been archived and what is coming up next."
        action={
          <Button variant="outline" asChild>
            <Link to="/family/$familyId" params={{ familyId }}>
              Open family profile
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Members joined",
            value: data?.counts.members,
            icon: Users2,
            to: "/members" as const,
          },
          {
            label: "People in the tree",
            value: data?.counts.persons,
            icon: Users2,
            to: "/tree" as const,
          },
          {
            label: "Photos & media",
            value: data?.counts.photos,
            icon: Images,
            to: "/gallery" as const,
          },
          {
            label: "Upcoming events",
            value: data?.counts.upcomingEvents,
            icon: CalendarDays,
            to: "/calendar" as const,
          },
          {
            label: "Stories shared",
            value: data?.counts.stories,
            icon: Sparkles,
            to: "/feed" as const,
          },
        ].map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to}>
            <Card className="card-lift h-full p-5">
              <Icon className="size-4 text-gold" />
              <p className="mt-3 font-display text-3xl font-semibold">{value ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">In your family tree</h2>
            <Button variant="outline" size="sm" asChild>
              <Link to="/tree">Open tree</Link>
            </Button>
          </div>
          {data && data.people.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              No one recorded yet. Add your parents and grandparents to begin the tree.
            </p>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(data?.people ?? []).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt=""
                    loading="lazy"
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-muted text-xs font-medium">
                    {p.name.slice(0, 1)}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.birthDate
                      ? `Born ${new Date(p.birthDate).toLocaleDateString()}`
                      : "No birth date yet"}
                  </span>
                </span>
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
            <p className="mt-4 text-sm text-muted-foreground">
              Nothing planned yet — create the next gathering.
            </p>
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

      <PaidFamilies />

      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Latest photos uploaded</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/gallery">Open gallery</Link>
          </Button>
        </div>
        {data && data.photos.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">No photos archived yet.</p>
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
