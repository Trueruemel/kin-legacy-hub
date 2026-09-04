import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { scopeAllowed, scopeDeniedResult } from "../scopes";

export default defineTool({
  name: "list_tree_people",
  title: "List family tree people",
  description: "List people recorded in a family's tree, newest first.",
  inputSchema: {
    familyId: z.string().uuid().describe("Family id from list_families."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum people to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ familyId, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!(await scopeAllowed(ctx, "tree"))) return scopeDeniedResult("tree");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("persons")
      .select("id, first_name, last_name, birth_date, death_date, birth_place")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const people = (data ?? []).map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(" "),
      birthDate: p.birth_date,
      deathDate: p.death_date,
      birthPlace: p.birth_place,
    }));
    return { content: [{ type: "text", text: JSON.stringify(people) }], structuredContent: { people } };
  },
});
