import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Cake, CalendarDays, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createEvent, listEvents, setEventRsvp } from "@/lib/events.functions";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CATEGORIES = ["gathering", "birthday", "anniversary", "memorial", "trip", "other"] as const;

function nextOccurrence(isoDate: string): Date {
  const source = new Date(isoDate);
  const today = new Date();
  const next = new Date(today.getFullYear(), source.getMonth(), source.getDate());
  if (next < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    next.setFullYear(today.getFullYear() + 1);
  }
  return next;
}

function daysFromToday(date: Date): number {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((date.getTime() - start.getTime()) / 86_400_000));
}

export function RealCalendar({ familyId, canEdit }: { familyId: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listEvents);
  const create = useServerFn(createEvent);
  const rsvp = useServerFn(setEventRsvp);

  const calendar = useQuery({
    queryKey: ["events", familyId],
    queryFn: () => list({ data: { familyId } }),
  });
  const events = calendar.data?.events ?? [];
  const birthdays = useMemo(
    () =>
      (calendar.data?.birthdays ?? [])
        .map((b) => ({ ...b, next: nextOccurrence(b.birthDate) }))
        .sort((a, b) => a.next.getTime() - b.next.getTime()),
    [calendar.data],
  );

  const [month, setMonth] = useState(new Date().getMonth());
  const year = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startsAt: "",
    endsAt: "",
    location: "",
    category: "gathering" as (typeof CATEGORIES)[number],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events", familyId] });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          familyId,
          title: form.title.trim(),
          startsAt: form.startsAt,
          category: form.category,
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(form.endsAt ? { endsAt: form.endsAt } : {}),
          ...(form.location.trim() ? { location: form.location.trim() } : {}),
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", startsAt: "", endsAt: "", location: "", category: "gathering" });
      void invalidate();
      toast.success("Event added to your family calendar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rsvpMutation = useMutation({
    mutationFn: (vars: { eventId: string; response: "going" | "maybe" | "no" }) =>
      rsvp({ data: { familyId, ...vars } }),
    onSuccess: () => {
      void invalidate();
      toast.success("RSVP saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const dayFor = (day: number) => {
    const target = new Date(year, month, day).toDateString();
    return {
      events: events.filter((e) => new Date(e.startsAt).toDateString() === target),
      birthdays: birthdays.filter((b) => b.next.toDateString() === target),
    };
  };

  return (
    <>
      <PageHeader
        title="Family Calendar"
        description={
          calendar.isLoading
            ? "Loading your family's plans…"
            : `${events.length} events planned · ${birthdays.length} birthdays in the tree.`
        }
        action={
          canEdit ? (
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Create event
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="birthdays">Birthdays</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-4">
          {!calendar.isLoading && events.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No events yet. Plan the next reunion, birthday dinner or memorial.
            </Card>
          )}
          {events.map((event) => (
            <Card key={event.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">{event.category}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.startsAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" · in "}
                  {daysFromToday(new Date(event.startsAt))} days
                </span>
              </div>
              <h3 className="mt-2 font-display text-xl font-semibold">{event.title}</h3>
              {event.location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" /> {event.location}
                </p>
              )}
              {event.description && <p className="mt-2 text-sm text-foreground/85">{event.description}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(["going", "maybe", "no"] as const).map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={event.myResponse === r ? "default" : "outline"}
                    disabled={rsvpMutation.isPending}
                    onClick={() => rsvpMutation.mutate({ eventId: event.id, response: r })}
                  >
                    {r === "going" ? "Going" : r === "maybe" ? "Maybe" : "Can't make it"}
                  </Button>
                ))}
                <span className="text-xs text-muted-foreground">
                  {event.going} going · {event.maybe} maybe · {event.declined} can't
                </span>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="month" className="mt-4">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setMonth((m) => (m + 11) % 12)}>
                Previous
              </Button>
              <h3 className="font-display text-xl font-semibold">
                {new Date(year, month).toLocaleString(undefined, { month: "long" })} {year}
              </h3>
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
                if (day === null) return <div key={`empty-${i}`} className="min-h-20 rounded-lg" />;
                const { events: evs, birthdays: bds } = dayFor(day);
                return (
                  <div key={day} className="min-h-20 rounded-lg border border-border p-1.5 text-left">
                    <span className="text-xs font-medium text-muted-foreground">{day}</span>
                    {bds.map((b) => (
                      <span
                        key={b.personId}
                        className="mt-1 block truncate rounded bg-gold/15 px-1 py-0.5 text-[10px] text-gold"
                      >
                        🎂 {b.name}
                      </span>
                    ))}
                    {evs.map((e) => (
                      <span
                        key={e.id}
                        className="mt-1 block truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary dark:text-gold"
                      >
                        {e.title}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="birthdays" className="mt-4">
          <Card className="divide-y divide-border p-0">
            {birthdays.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Add birth dates to your family tree and birthdays appear here.
              </p>
            )}
            {birthdays.map((b) => (
              <div key={b.personId} className="flex items-center gap-3 p-4">
                <Cake className="size-4 text-gold" />
                <span className="flex-1 font-medium">{b.name}</span>
                <span className="text-sm text-muted-foreground">
                  {MONTHS[b.next.getMonth()]} {b.next.getDate()} · in {daysFromToday(b.next)} days
                </span>
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="size-3.5" /> Events and RSVPs are shared privately with your family.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a family event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Summer reunion at the lake house"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ev-start">Starts</Label>
                <Input
                  id="ev-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ev-end">Ends (optional)</Label>
                <Input
                  id="ev-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-location">Where</Label>
              <Input
                id="ev-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Grandma's house, Lisbon"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-category">Occasion</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value as (typeof CATEGORIES)[number] })}
              >
                <SelectTrigger id="ev-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev-description">Details</Label>
              <Textarea
                id="ev-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-24"
                placeholder="What to bring, who's coming, the plan for the day…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createMutation.isPending || form.title.trim().length < 2 || !form.startsAt}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Saving…" : "Create event"}
            </Button>
          </DialogFooter>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
