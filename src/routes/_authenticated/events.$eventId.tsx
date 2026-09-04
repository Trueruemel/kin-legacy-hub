import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { Lightbox } from "@/components/lightbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { daysUntil, formatLongDate, relativeTime } from "@/lib/format";
import { events as seedEvents, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  loader: ({ params }) => {
    const event = seedEvents.find((e) => e.id === params.eventId);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Event not found — Eternal Memories" }, { name: "robots", content: "noindex" }] };
    }
    const { event } = loaderData;
    return {
      meta: [
        { title: `${event.title} — Family Event` },
        { name: "description", content: event.description.slice(0, 150) },
        { property: "og:title", content: `${event.title} — Family Event` },
        { property: "og:description", content: event.description.slice(0, 150) },
        { property: "og:image", content: event.coverPhotoUrl },
        { name: "twitter:image", content: event.coverPhotoUrl },
      ],
    };
  },
  component: EventPage,
});

function EventPage() {
  const { event } = Route.useLoaderData();
  const rsvps = useAppStore((s) => s.rsvps);
  const setRsvp = useAppStore((s) => s.setRsvp);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const myRsvp = rsvps[event.id];
  const days = daysUntil(event.date);

  return (
    <AppLayout>
      <Link to="/calendar" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to calendar
      </Link>

      <Card className="overflow-hidden p-0">
        <img src={event.coverPhotoUrl} alt="" className="h-56 w-full object-cover sm:h-72" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant="secondary" className="capitalize">{event.type}</Badge>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{event.title}</h1>
            </div>
            {days >= 0 && (
              <Badge className="text-sm">{days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`}</Badge>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatLongDate(event.date)}</span>
            {event.time && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{event.time}</span>}
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{event.location}</span>
          </div>

          <p className="mt-4 leading-relaxed text-foreground/90">{event.description}</p>

          <Separator className="my-5" />
          <p className="mb-2 text-sm font-medium">Will you be there?</p>
          <div className="flex flex-wrap gap-2">
            {(["going", "maybe", "no"] as const).map((option) => (
              <Button
                key={option}
                variant={myRsvp === option ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setRsvp(event.id, option);
                  toast.success(`RSVP saved: ${option.replace("_", " ")}`);
                }}
              >
                {option === "going" ? "Going" : option === "maybe" ? "Maybe" : "Can't make it"}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          {event.photos.length > 0 && (
            <Card className="p-5">
              <h2 className="font-display text-xl font-semibold">Photos from this gathering</h2>
              <Separator className="my-3" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {event.photos.map((url, i) => (
                  <button key={url} type="button" onClick={() => setLightbox(i)} className="overflow-hidden rounded-lg">
                    <img src={url} alt={`${event.title} photo ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover transition-transform hover:scale-105" />
                  </button>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-display text-xl font-semibold">Family notes</h2>
            <Separator className="my-3" />
            <div className="space-y-4">
              {event.comments.map((comment) => {
                const author = userById(comment.authorId);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={author.avatarUrl} alt="" />
                      <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{author.displayName}</span>{" "}
                        <span className="text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</span>
                      </p>
                      <p className="text-sm text-foreground/90">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
              {event.comments.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
            </div>
          </Card>
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="font-display text-lg font-semibold">
              Attending ({event.attendees.length + (myRsvp === "going" && !event.attendees.includes(currentUserId) ? 1 : 0)})
            </h2>
            <Separator className="my-3" />
            <div className="space-y-2">
              {event.attendees.map((id) => {
                const person = userById(id);
                return (
                  <Link key={id} to="/profile/$userId" params={{ userId: id }} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted">
                    <Avatar className="size-8">
                      <AvatarImage src={person.avatarUrl} alt="" />
                      <AvatarFallback>{person.firstName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{person.displayName}</span>
                  </Link>
                );
              })}
            </div>
            {event.maybe.length > 0 && (
              <>
                <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Maybe</p>
                <div className="mt-2 space-y-2">
                  {event.maybe.map((id) => {
                    const person = userById(id);
                    return (
                      <p key={id} className="text-sm text-muted-foreground">{person.displayName}</p>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </aside>
      </div>

      {lightbox !== null && (
        <Lightbox photos={event.photos.map((url) => ({ url, caption: event.title }))} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </AppLayout>
  );
}
