import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { addForumPost, getForumThread } from "@/lib/forums.functions";

export function RealForumThread({ familyId, threadId }: { familyId: string; threadId: string }) {
  const queryClient = useQueryClient();
  const load = useServerFn(getForumThread);
  const reply = useServerFn(addForumPost);
  const [draft, setDraft] = useState("");

  const query = useQuery({
    queryKey: ["forum-thread", threadId],
    queryFn: () => load({ data: { familyId, threadId } }),
  });

  const replyMutation = useMutation({
    mutationFn: () => reply({ data: { familyId, threadId, body: draft.trim() } }),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: ["forum-thread", threadId] });
      void queryClient.invalidateQueries({ queryKey: ["forum-threads", familyId] });
      toast.success("Reply posted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const thread = query.data?.thread ?? null;
  const posts = query.data?.posts ?? [];

  return (
    <>
      <Link
        to="/forums"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All conversations
      </Link>

      {query.isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>
      )}

      {!query.isLoading && !thread && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          This conversation is no longer available.
        </Card>
      )}

      {thread && (
        <>
          <Badge variant="secondary" className="capitalize">
            {thread.category}
          </Badge>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            {thread.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Started by {thread.authorName} on{" "}
            {new Date(thread.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>

          <div className="mt-6 space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="p-5">
                <div className="flex gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback>
                      {(post.authorName ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                      {post.body}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="mt-6 p-5">
            <h2 className="font-display text-lg font-semibold">Add to this conversation</h2>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-3 min-h-28"
              placeholder="Share what you remember…"
              aria-label="Write a reply"
            />
            <Button
              className="mt-3"
              disabled={!draft.trim() || replyMutation.isPending}
              onClick={() => replyMutation.mutate()}
            >
              {replyMutation.isPending ? "Posting…" : "Post reply"}
            </Button>
          </Card>
        </>
      )}
    </>
  );
}
