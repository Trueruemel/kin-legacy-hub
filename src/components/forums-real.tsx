import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Pin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  FORUM_CATEGORIES,
  type ForumCategory,
  createForumThread,
  listForumThreads,
} from "@/lib/forums.functions";

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days > 30) return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diff / 3_600_000);
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
}

export function RealForums({ familyId }: { familyId: string }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listForumThreads);
  const create = useServerFn(createForumThread);

  const [category, setCategory] = useState<ForumCategory | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general" as ForumCategory });

  const threads = useQuery({
    queryKey: ["forum-threads", familyId],
    queryFn: () => list({ data: { familyId } }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          familyId,
          title: form.title.trim(),
          body: form.body.trim(),
          category: form.category,
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", body: "", category: "general" });
      void queryClient.invalidateQueries({ queryKey: ["forum-threads", familyId] });
      toast.success("Your conversation is live.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (threads.data ?? []).filter((t) => category === "all" || t.category === category);

  return (
    <>
      <PageHeader
        title="Family Forum"
        description="Ask questions, trade stories and work through the family history together."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New conversation
          </Button>
        }
      />
      <p role="status" aria-live="polite" className="sr-only">
        {createMutation.isPending ? "Posting conversation" : ""}
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === "all" ? "default" : "outline"}
          onClick={() => setCategory("all")}
        >
          All
        </Button>
        {FORUM_CATEGORIES.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? "default" : "outline"}
            className="capitalize"
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {threads.isLoading && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Loading conversations…
        </Card>
      )}

      {!threads.isLoading && rows.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No conversations here yet. Start the first one.
        </Card>
      )}

      <div className="space-y-3">
        {rows.map((thread) => (
          <Card key={thread.id} className="p-0 transition-colors hover:border-gold/50">
            <Link
              to="/forums/$threadId"
              params={{ threadId: thread.id }}
              className="flex items-start gap-4 p-5"
            >
              <MessageSquare className="mt-1 size-5 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {thread.pinned && <Pin className="size-3.5 text-gold" />}
                  <Badge variant="secondary" className="capitalize">
                    {thread.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    started by {thread.authorName ?? "a family member"} ·{" "}
                    {relative(thread.createdAt)}
                  </span>
                </div>
                <h2 className="mt-2 truncate font-display text-lg font-semibold">{thread.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {thread.replies} {thread.replies === 1 ? "reply" : "replies"} · last activity{" "}
                  {relative(thread.updatedAt)}
                </p>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="th-title">Topic</Label>
              <Input
                id="th-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Who is the woman in the 1952 wedding photo?"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="th-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value as ForumCategory })}
              >
                <SelectTrigger id="th-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORUM_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="th-body">Your message</Label>
              <Textarea
                id="th-body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="min-h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                createMutation.isPending ||
                form.title.trim().length < 3 ||
                form.body.trim().length < 2
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Posting…" : "Post conversation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
