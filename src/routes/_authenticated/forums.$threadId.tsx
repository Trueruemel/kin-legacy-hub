import { RealForumThread } from "@/components/forum-thread-real";
import { useActiveFamily } from "@/hooks/use-active-family";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authenticated/forums/$threadId")({
  loader: ({ params }) => {
    // Real (backend) threads use UUID ids; the investor demo uses "t_" ids.
    if (UUID_RE.test(params.threadId)) return { thread: null };
    const thread = forumThreads.find((t) => t.id === params.threadId);
    if (!thread) throw notFound();
    return { thread };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.thread) {
      return { meta: [{ title: "Thread not found — Eternal — Memories" }, { name: "robots", content: "noindex" }] };
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
  const { threadId } = Route.useParams();
  const { thread } = Route.useLoaderData();
  const { family, loading } = useActiveFamily();

  if (!thread) {
    if (loading) {
      return (
        <AppLayout>
          <p className="py-24 text-center text-sm text-muted-foreground">Loading conversation…</p>
        </AppLayout>
      );
    }
    if (!family) {
      return (
        <AppLayout>
          <p className="py-24 text-center text-sm text-muted-foreground">
            This conversation belongs to a family archive you are not part of.
          </p>
        </AppLayout>
      );
    }
    return (
      <AppLayout>
        <RealForumThread familyId={family.id} threadId={threadId} />
      </AppLayout>
    );
  }

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
