import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

export type FamilyInvite = {
  id: string;
  email: string;
  role: "owner" | "steward" | "member" | "viewer";
  token: string;
  accepted: boolean;
  createdAt: string;
  expiresAt: string;
};

export type InvitePreview = {
  familyName: string;
  role: "owner" | "steward" | "member" | "viewer";
  email: string;
  accepted: boolean;
  expired: boolean;
  emailMatches: boolean;
};

const roleSchema = z.enum(["steward", "member", "viewer"]);

/** Open and accepted invitations of a family (admins only, enforced by RLS). */
export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FamilyInvite[]> => {
    const { data: rows, error } = await context.supabase
      .from("family_invitations")
      .select("id, email, role, token, accepted, created_at, expires_at")
      .eq("family_id", data.familyId)
      .order("created_at", { ascending: false });
    if (error) throwSafe(error, "listInvites");

    return (rows ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      token: row.token,
      accepted: row.accepted,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  });

/** Invites one email address into a family and returns the invite link token. */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        email: z.string().trim().email().max(200),
        role: roleSchema.default("member"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const email = data.email.toLowerCase();

    const { data: existing } = await supabase
      .from("family_invitations")
      .select("id, token")
      .eq("family_id", data.familyId)
      .eq("email", email)
      .eq("accepted", false)
      .maybeSingle();
    if (existing) return { id: existing.id, token: existing.token, email, reused: true };

    const { data: created, error } = await supabase
      .from("family_invitations")
      .insert({ family_id: data.familyId, email, role: data.role, invited_by: userId })
      .select("id, token")
      .single();
    if (error) throwSafe(error, "createInvite");
    return { id: created.id, token: created.token, email, reused: false };
  });

/** Withdraws an invitation that has not been used yet. */
export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("family_invitations").delete().eq("id", data.id);
    if (error) throwSafe(error, "revokeInvite");
    return { id: data.id };
  });

/** What an invited person sees before joining. */
export const previewInvite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<InvitePreview | null> => {
    const { data: rows, error } = await context.supabase.rpc("family_invitation_preview", {
      _token: data.token,
    });
    if (error) throwSafe(error, "previewInvite");
    const row = (rows ?? [])[0];
    if (!row) return null;

    return {
      familyName: row.family_name,
      role: row.role,
      email: row.email,
      accepted: row.accepted,
      expired: new Date(row.expires_at).getTime() < Date.now(),
      emailMatches: !!row.email_matches,
    };
  });

/** Joins the family behind the invite token. */
export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ familyId: string }> => {
    const { data: familyId, error } = await context.supabase.rpc("accept_family_invitation", {
      _token: data.token,
    });
    if (error) throwSafe(error, "acceptInvite");

    // Welcome the new member. Never let email trouble break joining.
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const origin = new URL(getRequest()!.url).origin;

      const [{ data: family }, { data: profile }] = await Promise.all([
        context.supabase
          .from("families")
          .select("name")
          .eq("id", familyId as string)
          .maybeSingle(),
        context.supabase
          .from("profiles")
          .select("display_name")
          .eq("id", context.userId)
          .maybeSingle(),
      ]);

      const recipient = (context.claims as { email?: string } | undefined)?.email;
      if (recipient) {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("family-welcome", recipient, {
          idempotencyKey: `family-welcome:${familyId}:${context.userId}`,
          templateData: {
            familyName: family?.name ?? "your family archive",
            memberName: profile?.display_name ?? undefined,
            siteUrl: origin,
            familyUrl: `${origin}/family/${familyId as string}`,
            treeUrl: `${origin}/tree`,
            calendarUrl: `${origin}/calendar`,
          },
        });
      }
    } catch (emailError) {
      console.error("family welcome email failed", emailError);
    }

    return { familyId: familyId as string };
  });
