import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .handler(async ({ data, context }): Promise<{ events: FamilyEvent[]; birthdays: BirthdayEntry[] }> => {
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
    if (error) throw new Error(error.message);
    if (rsvpError) throw new Error(rsvpError.message);

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
  });

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
    if (error) throw new Error(error.message);
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
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await supabase.from("event_rsvps").insert({
      family_id: data.familyId,
      event_id: data.eventId,
      user_id: userId,
      response: data.response,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Deletes an event the caller created. */
export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ eventId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.eventId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
