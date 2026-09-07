import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FeedComment = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
};

export type FeedPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  photos: string[];
  createdAt: string;
  reactions: Record<string, number>;
  myReaction: string | null;
  comments: FeedComment[];
};

const REACTIONS = ["heart", "joy", "sad", "wow"] as const;

/** Whole family feed: posts, reactions and comments with author profiles. */
export const listFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<FeedPost[]> => {
    const { supabase, userId } = context;

    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, author_id, text, photos, created_at")
      .eq("family_id", data.familyId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    if (!posts || posts.length === 0) return [];

    const ids = posts.map((p) => p.id);
    const [{ data: reactions }, { data: comments }] = await Promise.all([
      supabase.from("post_reactions").select("post_id, user_id, reaction").in("post_id", ids),
      supabase
        .from("post_comments")
        .select("id, post_id, author_id, text, created_at")
        .in("post_id", ids)
        .order("created_at", { ascending: true }),
    ]);

    const authorIds = [
      ...new Set([...posts.map((p) => p.author_id), ...(comments ?? []).map((c) => c.author_id)]),
    ];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", authorIds);
    const nameOf = (id: string) => profiles?.find((p) => p.id === id);

    return posts.map((post) => {
      const own = (reactions ?? []).filter((r) => r.post_id === post.id);
      const counts: Record<string, number> = {};
      for (const r of own) counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
      const profile = nameOf(post.author_id);
      return {
        id: post.id,
        authorId: post.author_id,
        authorName: profile?.display_name ?? "Family member",
        authorAvatar: profile?.avatar_url ?? null,
        text: post.text,
        photos: post.photos ?? [],
        createdAt: post.created_at,
        reactions: counts,
        myReaction: own.find((r) => r.user_id === userId)?.reaction ?? null,
        comments: (comments ?? [])
          .filter((c) => c.post_id === post.id)
          .map((c) => {
            const author = nameOf(c.author_id);
            return {
              id: c.id,
              authorId: c.author_id,
              authorName: author?.display_name ?? "Family member",
              authorAvatar: author?.avatar_url ?? null,
              text: c.text,
              createdAt: c.created_at,
            };
          }),
      };
    });
  });

/** Shares a new memory in the family feed. */
export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        text: z.string().trim().min(1).max(5000),
        photos: z.array(z.string().min(1).max(500)).max(9).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("posts").insert({
      family_id: data.familyId,
      author_id: context.userId,
      text: data.text,
      photos: data.photos ?? [],
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sets, switches or removes the caller's reaction on a post. */
export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        postId: z.string().uuid(),
        reaction: z.enum(REACTIONS),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("post_reactions")
      .select("id, reaction")
      .eq("post_id", data.postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing && existing.reaction === data.reaction) {
      const { error } = await supabase.from("post_reactions").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { reaction: null };
    }
    if (existing) {
      const { error } = await supabase
        .from("post_reactions")
        .update({ reaction: data.reaction })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { reaction: data.reaction };
    }
    const { error } = await supabase.from("post_reactions").insert({
      family_id: data.familyId,
      post_id: data.postId,
      user_id: userId,
      reaction: data.reaction,
    });
    if (error) throw new Error(error.message);
    return { reaction: data.reaction };
  });

/** Adds a comment under a post. */
export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        postId: z.string().uuid(),
        text: z.string().trim().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("post_comments").insert({
      family_id: data.familyId,
      post_id: data.postId,
      author_id: context.userId,
      text: data.text,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
