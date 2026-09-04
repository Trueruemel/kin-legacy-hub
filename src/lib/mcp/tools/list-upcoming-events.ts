import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { scopeAllowed, scopeDeniedResult } from "../scopes";

export default defineTool({
  name: "list_upcoming_events",
  title: "List upcoming events",
  description: "List a family's upcoming events, soonest first.",
  inputSchema: {
    familyId: z.string().uuid().describe("Family id from list_families."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum events to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ familyId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!(await scopeAllowed(ctx, "events"))) return scopeDeniedResult("events");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, location, category")
      .eq("family_id", familyId)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const events = data ?? [];
    return { content: [{ type: "text", text: JSON.stringify(events) }], structuredContent: { events } };
  },
});
