import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";

import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/format";
import { chats, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { RealMessages } from "@/components/messages-real";
import { useActiveFamily } from "@/hooks/use-active-family";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Eternal — Memories" },
      { name: "description", content: "Private family group chats and one-to-one conversations." },
      { property: "og:title", content: "Messages — Eternal — Memories" },
      { property: "og:description", content: "Keep the everyday conversation in the same place as the memories." },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { family, loading } = useActiveFamily();
  const { user } = useAuth();
  if (loading) {
    return (
      <AppLayout wide>
        <p className="py-24 text-center text-sm text-muted-foreground">Loading messages…</p>
      </AppLayout>
    );
  }
  if (family && user) {
    return (
      <AppLayout wide>
        <RealMessages familyId={family.id} userId={user.id} />
      </AppLayout>
    );
  }
  return <DemoMessages />;
}

function DemoMessages() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const allMessages = useAppStore((s) => s.chatMessages);
  const sendMessage = useAppStore((s) => s.sendMessage);

  const familyChats = useMemo(() => chats.filter((c) => c.familyId === familyId), [familyId]);
  const [chatId, setChatId] = useState(familyChats[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const activeId = familyChats.some((c) => c.id === chatId) ? chatId : (familyChats[0]?.id ?? "");
  const chat = familyChats.find((c) => c.id === activeId);
  const messages = allMessages.filter((m) => m.chatId === activeId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeId]);

  return (
    <AppLayout wide>
      <h1 className="mb-4 font-display text-3xl font-semibold tracking-tight">Messages</h1>
      <Card className="grid h-[70vh] grid-cols-1 overflow-hidden p-0 md:grid-cols-[18rem_1fr]">
        <div className="hidden divide-y divide-border overflow-y-auto border-r border-border md:block">
          {familyChats.map((c) => {
            const last = allMessages.filter((m) => m.chatId === c.id).at(-1);
            const other = c.kind === "direct" ? userById(c.participantIds.find((p) => p !== currentUserId) ?? c.participantIds[0]!) : null;
            return (
              <button
                key={c.id}
                onClick={() => setChatId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent",
                  c.id === activeId && "bg-accent",
                )}
              >
                <Avatar className="size-10">
                  <AvatarImage src={c.avatarUrl ?? other?.avatarUrl} alt="" />
                  <AvatarFallback>{c.name[0]}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {last ? last.text : "No messages yet"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border p-3">
            <Avatar className="size-9">
              <AvatarImage src={chat?.avatarUrl} alt="" />
              <AvatarFallback>{chat?.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-display text-base font-semibold">{chat?.name}</p>
              <p className="text-xs text-muted-foreground">
                {chat?.kind === "group" ? `${chat.participantIds.length} members` : "Direct message"}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => {
              const mine = m.authorId === currentUserId;
              const author = userById(m.authorId);
              return (
                <div key={m.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={author.avatarUrl} alt="" />
                    <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[75%]", mine && "text-right")}>
                    {!mine && <p className="mb-0.5 text-xs font-medium text-muted-foreground">{author.displayName}</p>}
                    <p
                      className={cn(
                        "inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      {m.text}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(m.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-center gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              sendMessage(activeId, draft.trim());
              setDraft("");
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              aria-label="Write a message"
              className="rounded-full"
            />
            <Button type="submit" size="icon" aria-label="Send message">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </Card>
    </AppLayout>
  );
}
