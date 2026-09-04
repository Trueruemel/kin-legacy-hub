import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_families",
  title: "List my families",
  description: "List the families the signed-in user belongs to, with their role in each.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("family_members")
      .select("role, family_id, families(id, name)")
      .eq("user_id", ctx.getUserId());
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const families = (data ?? []).map((row) => ({
      id: row.family_id as string,
      name: (row.families as { name?: string } | null)?.name ?? "Family",
      role: row.role as string,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(families) }],
      structuredContent: { families },
    };
  },
});
