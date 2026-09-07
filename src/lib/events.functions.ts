import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

export type FamilyEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  category: string;
  going: number;
  maybe: number;
  declined: number;
  myResponse: "going" | "maybe" | "no" | null;
};

export type BirthdayEntry = {
  personId: string;
  name: string;
  birthDate: string;
};

const RESPONSES = ["going", "maybe", "no"] as const;

/** Events of a family with RSVP counts and the caller's own response. */
export const listEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(
    async ({ data, context }): Promise<{ events: FamilyEvent[]; birthdays: BirthdayEntry[] }> => {
      const { supabase, userId } = context;
      const [{ data: events, error }, { data: rsvps, error: rsvpError }, { data: persons }] =
        await Promise.all([
          supabase
            .from("events")
            .select("id, title, description, starts_at, ends_at, location, category")
            .eq("family_id", data.familyId)
            .order("starts_at", { ascending: true }),
          supabase
            .from("event_rsvps")
            .select("event_id, user_id, response")
            .eq("family_id", data.familyId),
          supabase
            .from("persons")
            .select("id, first_name, last_name, birth_date, death_date")
            .eq("family_id", data.familyId)
            .not("birth_date", "is", null)
            .is("death_date", null),
        ]);
      if (error) throwSafe(error, "listEvents");
      if (rsvpError) throwSafe(rsvpError, "listEvents");

      const all = rsvps ?? [];
      return {
        events: (events ?? []).map((e) => {
          const mine = all.find((r) => r.event_id === e.id && r.user_id === userId);
          const count = (response: string) =>
            all.filter((r) => r.event_id === e.id && r.response === response).length;
          return {
            id: e.id,
            title: e.title,
            description: e.description,
            startsAt: e.starts_at,
            endsAt: e.ends_at,
            location: e.location,
            category: e.category ?? "gathering",
            going: count("going"),
            maybe: count("maybe"),
            declined: count("no"),
            myResponse: (mine?.response as "going" | "maybe" | "no" | undefined) ?? null,
          };
        }),
        birthdays: (persons ?? [])
          .filter((p): p is typeof p & { birth_date: string } => !!p.birth_date)
          .map((p) => ({
            personId: p.id,
            name: [p.first_name, p.last_name].filter(Boolean).join(" "),
            birthDate: p.birth_date,
          })),
      };
    },
  );

/** Creates an event for the family. */
export const createEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().max(2000).optional(),
        startsAt: z.string().min(10),
        endsAt: z.string().min(10).optional(),
        location: z.string().trim().max(160).optional(),
        category: z.enum(["gathering", "birthday", "anniversary", "memorial", "trip", "other"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const id = crypto.randomUUID();
    const { error } = await context.supabase.from("events").insert({
      id,
      family_id: data.familyId,
      title: data.title,
      description: data.description ?? null,
      starts_at: new Date(data.startsAt).toISOString(),
      ends_at: data.endsAt ? new Date(data.endsAt).toISOString() : null,
      location: data.location ?? null,
      category: data.category,
      created_by: context.userId,
    });
    if (error) throwSafe(error, "createEvent");
    return { id };
  });

/** Saves the caller's RSVP for an event. */
export const setEventRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        eventId: z.string().uuid(),
        response: z.enum(RESPONSES),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("event_rsvps")
      .select("id")
      .eq("event_id", data.eventId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("event_rsvps")
        .update({ response: data.response, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throwSafe(error, "setEventRsvp");
      return { ok: true };
    }

    const { error } = await supabase.from("event_rsvps").insert({
      family_id: data.familyId,
      event_id: data.eventId,
      user_id: userId,
      response: data.response,
    });
    if (error) throwSafe(error, "setEventRsvp");
    return { ok: true };
  });

/** Updates an event the family may edit. */
export const updateEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().max(2000).optional(),
        startsAt: z.string().min(10),
        endsAt: z.string().min(10).optional(),
        location: z.string().trim().max(160).optional(),
        category: z.enum(["gathering", "birthday", "anniversary", "memorial", "trip", "other"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("events")
      .update({
        title: data.title,
        description: data.description ?? null,
        starts_at: new Date(data.startsAt).toISOString(),
        ends_at: data.endsAt ? new Date(data.endsAt).toISOString() : null,
        location: data.location ?? null,
        category: data.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.eventId);
    if (error) throwSafe(error, "updateEvent");
    return { ok: true };
  });

/** Deletes an event the caller created. */
export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.eventId);
    if (error) throwSafe(error, "deleteEvent");
    return { ok: true };
  });

/**
 * Emails one relative an invitation to — or a reminder about — a single event.
 * One send per call, triggered by an explicit action of a family member.
 */
export const sendEventEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        eventId: z.string().uuid(),
        email: z.string().trim().email().max(200),
        kind: z.enum(["invitation", "reminder"]).default("invitation"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ sent: boolean; reason?: string }> => {
    const { supabase, userId } = context;
    // RLS limits this read to events of families the caller belongs to.
    const { data: event, error } = await supabase
      .from("events")
      .select("id, family_id, title, description, starts_at, ends_at, location")
      .eq("id", data.eventId)
      .maybeSingle();
    if (error) throwSafe(error, "sendEventEmail");
    if (!event) throw new Error("That event is not available to you.");

    const [{ data: family }, { data: profile }] = await Promise.all([
      supabase.from("families").select("name").eq("id", event.family_id).maybeSingle(),
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    ]);

    const { getRequest } = await import("@tanstack/react-start/server");
    const origin = new URL(getRequest()!.url).origin;
    const starts = new Date(event.starts_at);
    const when = starts.toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail("event-invite", data.email, {
      idempotencyKey: `event-${data.kind}:${event.id}:${data.email}:${event.starts_at}`,
      templateData: {
        kind: data.kind,
        familyName: family?.name ?? "your family",
        eventTitle: event.title,
        when: `${when} (UTC)`,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
        calendarUrl: `${origin}/calendar`,
        invitedByName: profile?.display_name ?? undefined,
      },
    });

    return result.sent ? { sent: true } : { sent: false, reason: result.reason };
  });
