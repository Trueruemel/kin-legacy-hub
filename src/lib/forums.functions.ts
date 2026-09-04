import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FORUM_CATEGORIES = [
  "recipes",
  "traditions",
  "research",
  "advice",
  "general",
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export type ForumThreadRow = {
  id: string;
  title: string;
  category: string;
  pinned: boolean;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  replies: number;
  lastReplyAt: string | null;
};

export type ForumPostRow = {
  id: string;
  body: string;
  authorName: string;
  authorAvatarUrl: string | null;
  isMe: boolean;
  createdAt: string;
};

async function profileNames(
  supabase: { from: (t: string) => any },
  ids: string[],
): Promise<Map<string, { name: string; avatarUrl: string | null }>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, { name: string; avatarUrl: string | null }>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", unique);
  for (const row of (data ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]) {
    map.set(row.id, { name: row.display_name ?? "Family member", avatarUrl: row.avatar_url });
  }
  return map;
}

/** Forum threads of a family with reply counts. */
export const listForumThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ForumThreadRow[]> => {
    const { supabase } = context;
    const [{ data: threads, error }, { data: posts, error: postError }] = await Promise.all([
      supabase
        .from("forum_threads")
        .select("id, title, category, pinned, author_id, created_at, updated_at")
        .eq("family_id", data.familyId)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false }),
      supabase.from("forum_posts").select("id, thread_id, created_at").eq("family_id", data.familyId),
    ]);
    if (error) throw new Error(error.message);
    if (postError) throw new Error(postError.message);

    const names = await profileNames(supabase, (threads ?? []).map((t) => t.author_id));
    return (threads ?? []).map((t) => {
      const replies = (posts ?? []).filter((p) => p.thread_id === t.id);
      const last = replies
        .map((p) => p.created_at)
        .sort()
        .at(-1);
      return {
        id: t.id,
        title: t.title,
        category: t.category ?? "general",
        pinned: !!t.pinned,
        authorName: names.get(t.author_id)?.name ?? "Family member",
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        replies: replies.length,
        lastReplyAt: last ?? null,
      };
    });
  });

/** A single thread with its posts. */
export const getForumThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ familyId: z.string().uuid(), threadId: z.string().uuid() }).parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ thread: ForumThreadRow | null; posts: ForumPostRow[] }> => {
      const { supabase, userId } = context;
      const { data: thread, error } = await supabase
        .from("forum_threads")
        .select("id, title, category, pinned, author_id, created_at, updated_at")
        .eq("family_id", data.familyId)
        .eq("id", data.threadId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!thread) return { thread: null, posts: [] };

      const { data: posts, error: postError } = await supabase
        .from("forum_posts")
        .select("id, body, author_id, created_at")
        .eq("thread_id", data.threadId)
        .order("created_at", { ascending: true });
      if (postError) throw new Error(postError.message);

      const names = await profileNames(supabase, [
        thread.author_id,
        ...(posts ?? []).map((p) => p.author_id),
      ]);

      return {
        thread: {
          id: thread.id,
          title: thread.title,
          category: thread.category ?? "general",
          pinned: !!thread.pinned,
          authorName: names.get(thread.author_id)?.name ?? "Family member",
          createdAt: thread.created_at,
          updatedAt: thread.updated_at,
          replies: (posts ?? []).length,
          lastReplyAt: (posts ?? []).at(-1)?.created_at ?? null,
        },
        posts: (posts ?? []).map((p) => ({
          id: p.id,
          body: p.body,
          authorName: names.get(p.author_id)?.name ?? "Family member",
          authorAvatarUrl: names.get(p.author_id)?.avatarUrl ?? null,
          isMe: p.author_id === userId,
          createdAt: p.created_at,
        })),
      };
    },
  );

/** Starts a new thread, with its opening post. */
export const createForumThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        title: z.string().trim().min(3).max(140),
        category: z.enum(FORUM_CATEGORIES),
        body: z.string().trim().min(2).max(8000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const id = crypto.randomUUID();
    const { error } = await supabase.from("forum_threads").insert({
      id,
      family_id: data.familyId,
      title: data.title,
      category: data.category,
      author_id: userId,
    });
    if (error) throw new Error(error.message);

    const { error: postError } = await supabase.from("forum_posts").insert({
      family_id: data.familyId,
      thread_id: id,
      author_id: userId,
      body: data.body,
    });
    if (postError) throw new Error(postError.message);
    return { id };
  });

/** Adds a reply to a thread. */
export const addForumPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        threadId: z.string().uuid(),
        body: z.string().trim().min(1).max(8000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("forum_posts").insert({
      family_id: data.familyId,
      thread_id: data.threadId,
      author_id: userId,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await supabase
      .from("forum_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.threadId);
    return { ok: true };
  });
