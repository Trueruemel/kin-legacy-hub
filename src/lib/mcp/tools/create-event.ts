import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { scopeAllowed, scopeDeniedResult } from "../scopes";

export default defineTool({
  name: "create_event",
  title: "Create a family event",
  description: "Add an event to a family's calendar.",
  inputSchema: {
    familyId: z.string().uuid().describe("Family id from list_families."),
    title: z.string().trim().min(1).max(160).describe("Event title."),
    startsAt: z.string().describe("Start time as an ISO 8601 timestamp."),
    endsAt: z.string().optional().describe("Optional end time as an ISO 8601 timestamp."),
    location: z.string().trim().max(200).optional().describe("Optional location."),
    description: z.string().trim().max(2000).optional().describe("Optional details."),
    category: z
      .string()
      .trim()
      .max(40)
      .optional()
      .describe("Optional category, e.g. birthday or reunion."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!(await scopeAllowed(ctx, "events"))) return scopeDeniedResult("events");
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return {
        content: [{ type: "text", text: "startsAt is not a valid timestamp" }],
        isError: true,
      };
    }
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      return {
        content: [{ type: "text", text: "endsAt is not a valid timestamp" }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("events")
      .insert({
        family_id: input.familyId,
        title: input.title,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt ? endsAt.toISOString() : null,
        location: input.location ?? null,
        description: input.description ?? null,
        ...(input.category ? { category: input.category } : {}),
        created_by: ctx.getUserId(),
      })
      .select("id, title, starts_at, ends_at, location, category")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});
