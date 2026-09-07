import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { relativeTime } from "@/lib/format";
import { listFamilyMembers } from "@/lib/members.functions";
import { createChat, listChats, listMessages, sendChatMessage } from "@/lib/messages.functions";
import { cn } from "@/lib/utils";

export function RealMessages({ familyId, userId }: { familyId: string; userId: string }) {
  const queryClient = useQueryClient();
  const chatsFn = useServerFn(listChats);
  const messagesFn = useServerFn(listMessages);
  const sendFn = useServerFn(sendChatMessage);
  const createFn = useServerFn(createChat);
  const membersFn = useServerFn(listFamilyMembers);

  const chats = useQuery({
    queryKey: ["chats", familyId],
    queryFn: () => chatsFn({ data: { familyId } }),
  });
  const members = useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => membersFn({ data: { familyId } }),
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const list = chats.data ?? [];
  const chatId = list.some((c) => c.id === activeId) ? activeId : (list[0]?.id ?? null);

  const messages = useQuery({
    queryKey: ["chat-messages", chatId],
    queryFn: () => messagesFn({ data: { chatId: chatId as string } }),
    enabled: !!chatId,
    refetchInterval: 8000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length, chatId]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => sendFn({ data: { familyId, chatId: chatId as string, text } }),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: () => createFn({ data: { familyId, title: title.trim(), memberIds: picked } }),
    onSuccess: (result) => {
      setOpen(false);
      setTitle("");
      setPicked([]);
      setActiveId(result.id);
      void queryClient.invalidateQueries({ queryKey: ["chats", familyId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Messages</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New chat
        </Button>
      </div>

      <Card className="grid h-[70vh] grid-cols-1 overflow-hidden p-0 md:grid-cols-[18rem_1fr]">
        <div className="hidden border-r md:block">
          <ul className="divide-y">
            {list.map((chat) => (
              <li key={chat.id}>
                <button
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                    chat.id === chatId && "bg-accent",
                  )}
                  onClick={() => setActiveId(chat.id)}
                >
                  <p className="truncate font-medium">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {chat.memberCount} member{chat.memberCount === 1 ? "" : "s"}
                  </p>
                </button>
              </li>
            ))}
            {list.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">No chats yet.</li>
            )}
          </ul>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!chatId && (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Start a chat to talk with your family.
              </p>
            )}
            {(messages.data ?? []).map((m) => {
              const mine = m.authorId === userId;
              return (
                <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                  <Avatar className="size-8">
                    {m.authorAvatar && <AvatarImage src={m.authorAvatar} alt="" />}
                    <AvatarFallback>{m.authorName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                      mine ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {!mine && <p className="text-xs font-medium opacity-70">{m.authorName}</p>}
                    <p className="whitespace-pre-line">{m.text}</p>
                    <p className="mt-1 text-[10px] opacity-60">{relativeTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form
            className="flex gap-2 border-t p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (chatId && draft.trim()) sendMutation.mutate(draft.trim());
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              aria-label="Write a message"
              disabled={!chatId}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              className="min-h-11 min-w-11"
              disabled={!chatId || !draft.trim()}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">New chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="chat-title">Name</Label>
              <Input
                id="chat-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sunday planning"
              />
            </div>
            <div className="space-y-1">
              <Label>Who is in it?</Label>
              {(members.data ?? [])
                .filter((m) => !m.isMe)
                .map((m) => (
                  <label key={m.userId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={picked.includes(m.userId)}
                      onChange={(e) =>
                        setPicked((p) =>
                          e.target.checked ? [...p, m.userId] : p.filter((id) => id !== m.userId),
                        )
                      }
                    />
                    {m.name}
                  </label>
                ))}
              {(members.data ?? []).filter((m) => !m.isMe).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Invite family members on the Members page first.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!title.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Create chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
