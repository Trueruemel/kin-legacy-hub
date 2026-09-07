import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { throwSafe } from "./safe-error";

export type ChatSummary = {
  id: string;
  title: string;
  isGroup: boolean;
  memberCount: number;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  text: string;
  createdAt: string;
};

/** Chats the caller is a member of, inside the given family. */
export const listChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ familyId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ChatSummary[]> => {
    const { supabase } = context;
    const { data: chats, error } = await supabase
      .from("chats")
      .select("id, title, is_group, updated_at")
      .eq("family_id", data.familyId)
      .order("updated_at", { ascending: false });
    if (error) throwSafe(error, "listChats");
    if (!chats || chats.length === 0) return [];

    const { data: members } = await supabase
      .from("chat_members")
      .select("chat_id")
      .in(
        "chat_id",
        chats.map((c) => c.id),
      );

    return chats.map((c) => ({
      id: c.id,
      title: c.title ?? "Family chat",
      isGroup: c.is_group,
      memberCount: (members ?? []).filter((m) => m.chat_id === c.id).length,
      updatedAt: c.updated_at,
    }));
  });

/** Messages of one chat, newest last. */
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ChatMessage[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("chat_messages")
      .select("id, author_id, text, created_at")
      .eq("chat_id", data.chatId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (error) throwSafe(error, "listMessages");
    if (!rows || rows.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", [...new Set(rows.map((r) => r.author_id))]);

    return rows.map((r) => {
      const profile = profiles?.find((p) => p.id === r.author_id);
      return {
        id: r.id,
        authorId: r.author_id,
        authorName: profile?.display_name ?? "Family member",
        authorAvatar: profile?.avatar_url ?? null,
        text: r.text,
        createdAt: r.created_at,
      };
    });
  });

/** Creates a chat and adds the caller plus the chosen family members. */
export const createChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        title: z.string().trim().min(1).max(80),
        memberIds: z.array(z.string().uuid()).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Only people who actually belong to this family may join the chat.
    const requested = [...new Set([userId, ...(data.memberIds ?? [])])];
    const { data: familyMembers, error: membershipError } = await supabase
      .from("family_members")
      .select("user_id")
      .eq("family_id", data.familyId)
      .in("user_id", requested);
    if (membershipError) throwSafe(membershipError, "createChat");

    const allowed = new Set((familyMembers ?? []).map((m) => m.user_id));
    if (!allowed.has(userId)) throw new Error("You are not a member of this family.");
    if (requested.some((id) => !allowed.has(id))) {
      throw new Error("Everyone in a chat must be a member of this family.");
    }

    const chatId = crypto.randomUUID();
    const { error } = await supabase.from("chats").insert({
      id: chatId,
      family_id: data.familyId,
      title: data.title,
      is_group: (data.memberIds?.length ?? 0) !== 1,
      created_by: userId,
    });
    if (error) throwSafe(error, "createChat");

    const { error: memberError } = await supabase
      .from("chat_members")
      .insert(requested.map((id) => ({ chat_id: chatId, family_id: data.familyId, user_id: id })));
    if (memberError) throwSafe(memberError, "createChat");
    return { id: chatId };
  });

/** Sends a message into a chat the caller belongs to. */
export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        chatId: z.string().uuid(),
        text: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("chat_messages").insert({
      chat_id: data.chatId,
      family_id: data.familyId,
      author_id: userId,
      text: data.text,
    });
    if (error) throwSafe(error, "sendChatMessage");
    await supabase
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.chatId);
    return { ok: true };
  });
