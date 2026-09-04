import type { ToolContext } from "@lovable.dev/mcp-js";

import { supabaseForUser } from "./supabase";

export type ScopeArea = "tree" | "photos" | "events";

const columns: Record<ScopeArea, "allow_tree" | "allow_photos" | "allow_events"> = {
  tree: "allow_tree",
  photos: "allow_photos",
  events: "allow_events",
};

const defaults: Record<ScopeArea, boolean> = { tree: true, photos: false, events: true };

const labels: Record<ScopeArea, string> = {
  tree: "family tree",
  photos: "photos",
  events: "calendar events",
};

/**
 * Whether the connected assistant is allowed to touch one area of the archive.
 * The person decides this on the consent screen; the row is stored per user and
 * read with the caller's own token, so row-level security still applies.
 */
export async function scopeAllowed(ctx: ToolContext, area: ScopeArea): Promise<boolean> {
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("assistant_scopes")
    .select(columns[area])
    .eq("user_id", ctx.getUserId() ?? "")
    .maybeSingle();
  if (error) return false;
  const row = data as Record<string, boolean> | null;
  if (!row) return defaults[area];
  return row[columns[area]] === true;
}

export function scopeDeniedResult(area: ScopeArea) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Access to ${labels[area]} was not granted for this connection. The account owner can turn it on again on the connection approval screen in Eternal — Memories.`,
      },
    ],
    isError: true,
  };
}
