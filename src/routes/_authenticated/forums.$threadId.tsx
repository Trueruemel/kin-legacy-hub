import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatLongDate, relativeTime } from "@/lib/format";
import { forumCategories, forumThreads, userById } from "@/lib/mock-data";
import type { ForumPost } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/forums/$threadId")({
  loader: ({ params }) => {
    const thread = forumThreads.find((t) => t.id === params.threadId);
    if (!thread) throw notFound();
    return { thread };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Thread not found — Eternal Memories" }, { name: "robots", content: "noindex" }] };
    }
    const { thread } = loaderData;
    return {
      meta: [
        { title: `${thread.title} — Family Forums` },
        { name: "description", content: thread.posts[0]?.body.slice(0, 150) ?? "A family forum discussion." },
        { property: "og:title", content: `${thread.title} — Family Forums` },
        { property: "og:description", content: thread.posts[0]?.body.slice(0, 150) ?? "A family forum discussion." },
      ],
    };
  },
  component: ThreadPage,
});

function ThreadPage() {
  const { thread } = Route.useLoaderData();
  const category = forumCategories.find((c) => c.id === thread.categoryId);
  const [replies, setReplies] = useState<ForumPost[]>([]);
  const [draft, setDraft] = useState("");
  const posts = [...thread.posts, ...replies];

  return (
    <AppLayout>
      <Link to="/forums" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All forums
      </Link>

      <Badge variant="secondary">{category?.name}</Badge>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{thread.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Started by {userById(thread.authorId).displayName} on {formatLongDate(thread.createdAt)}
      </p>

      <div className="mt-6 space-y-4">
        {posts.map((post) => {
          const author = userById(post.authorId);
          return (
            <Card key={post.id} className="p-5">
              <div className="flex gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={author.avatarUrl} alt="" />
                  <AvatarFallback>{author.firstName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold">{author.displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {author.relationshipToViewer} · {relativeTime(post.createdAt)}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
                    {post.body}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-lg font-semibold">Add to this thread</h2>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-3 min-h-28"
          placeholder="Share what you remember…"
          aria-label="Write a reply"
        />
        <Button
          className="mt-3"
          disabled={!draft.trim()}
          onClick={() => {
            setReplies((r) => [
              ...r,
              { id: `p_${Date.now()}`, authorId: "u_john", body: draft.trim(), createdAt: new Date().toISOString() },
            ]);
            setDraft("");
            toast.success("Reply posted");
          }}
        >
          Post reply
        </Button>
      </Card>
    </AppLayout>
  );
}
