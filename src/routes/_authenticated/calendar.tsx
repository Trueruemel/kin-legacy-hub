import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Cake, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysUntil, formatDate, nextBirthday } from "@/lib/format";
import { events as allEvents, users } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Family Calendar — Eternal — Memories" },
      { name: "description", content: "Reunions, birthdays and anniversaries — everything your family gathers around." },
      { property: "og:title", content: "Family Calendar — Eternal — Memories" },
      { property: "og:description", content: "Never miss a birthday, reunion or anniversary again." },
    ],
  }),
  component: CalendarPage,
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function CalendarPage() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const rsvps = useAppStore((s) => s.rsvps);
  const setRsvp = useAppStore((s) => s.setRsvp);
  const [month, setMonth] = useState(new Date().getMonth());
  const year = new Date().getFullYear();

  const events = useMemo(
    () => allEvents.filter((e) => e.familyId === familyId).sort((a, b) => a.date.localeCompare(b.date)),
    [familyId],
  );

  const birthdays = useMemo(
    () =>
      users
        .filter((u) => u.familyId === familyId && u.status === "living")
        .map((u) => ({ user: u, date: nextBirthday(u.birthDate) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [familyId],
  );

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const dayEvents = (day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return {
      events: events.filter((e) => e.date === iso),
      birthdays: birthdays.filter(
        (b) => b.date.getMonth() === month && b.date.getDate() === day,
      ),
    };
  };

  return (
    <AppLayout wide>
      <PageHeader
        title="Family Calendar"
        description="Everything the family is gathering around this year."
        action={
          <Button onClick={() => toast.success("Event draft created")}>
            <Plus className="size-4" /> Create event
          </Button>
        }
      />

      <Tabs defaultValue="month">
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="birthdays">Birthdays</TabsTrigger>
        </TabsList>

        <TabsContent value="month" className="mt-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => (m + 11) % 12)}>
                Previous
              </Button>
              <h2 className="font-display text-xl font-semibold">
                {new Date(year, month).toLocaleString("en-US", { month: "long" })} {year}
              </h2>
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => (m + 1) % 12)}>
                Next
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} className="min-h-20 rounded-lg" />;
                const { events: evs, birthdays: bds } = dayEvents(day);
                return (
                  <div key={day} className="min-h-20 rounded-lg border border-border p-1.5 text-left">
                    <span className="text-xs font-medium text-muted-foreground">{day}</span>
                    {bds.map((b) => (
                      <span key={b.user.id} className="mt-1 block truncate rounded bg-gold/15 px-1 py-0.5 text-[10px] text-gold">
                        🎂 {b.user.firstName}
                      </span>
                    ))}
                    {evs.map((e) => (
                      <Link
                        key={e.id}
                        to="/events/$eventId"
                        params={{ eventId: e.id }}
                        className="mt-1 block truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary hover:underline dark:text-gold"
                      >
                        {e.title}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {events.map((event) => (
            <Card key={event.id} className="card-lift overflow-hidden p-0 sm:flex">
              <img
                src={event.coverPhotoUrl}
                alt={event.title}
                loading="lazy"
                className="h-40 w-full object-cover sm:h-auto sm:w-56"
              />
              <div className="flex-1 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{event.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(event.date)} · in {daysUntil(event.date)} days
                  </span>
                </div>
                <Link to="/events/$eventId" params={{ eventId: event.id }}>
                  <h2 className="mt-2 font-display text-xl font-semibold hover:underline">{event.title}</h2>
                </Link>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {event.location}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-foreground/85">{event.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["going", "maybe", "no"] as const).map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={rsvps[event.id] === r ? "default" : "outline"}
                      onClick={() => {
                        setRsvp(event.id, r);
                        toast.success(`RSVP saved: ${r}`);
                      }}
                    >
                      {r === "going" ? "Going" : r === "maybe" ? "Maybe" : "Can't make it"}
                    </Button>
                  ))}
                  <span className="self-center text-xs text-muted-foreground">
                    {event.attendees.length} going · {event.maybe.length} maybe
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="birthdays" className="mt-4">
          <Card className="divide-y divide-border p-0">
            {birthdays.map(({ user, date }) => (
              <Link
                key={user.id}
                to="/profile/$userId"
                params={{ userId: user.id }}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-accent"
              >
                <Cake className="size-4 text-gold" />
                <img src={user.avatarUrl} alt="" loading="lazy" className="size-9 rounded-full object-cover" />
                <span className="flex-1 font-medium">{user.displayName}</span>
                <span className="text-sm text-muted-foreground">
                  {MONTHS[date.getMonth()]} {date.getDate()} · in {daysUntil(date.toISOString())} days
                </span>
              </Link>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" /> Demo data — RSVPs are stored locally for this session.
      </p>
    </AppLayout>
  );
}
