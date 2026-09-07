import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listFamilies from "./tools/list-families";
import listTreePeople from "./tools/list-tree-people";
import listUpcomingEvents from "./tools/list-upcoming-events";
import createEvent from "./tools/create-event";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged, and Vite inlines it at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "remix-of-eternalmemorys",
  title: "Remix of EternalMemorys",
  version: "0.1.0",
  instructions:
    "Tools for the Eternal — Memories family archive. Start with `list_families` to get a family id, then read the tree with `list_tree_people`, read the calendar with `list_upcoming_events`, or add a milestone with `create_event`. All data is scoped to the signed-in user's families.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFamilies, listTreePeople, listUpcomingEvents, createEvent] as unknown as never[],
});
