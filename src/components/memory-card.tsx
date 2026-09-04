import { Link } from "@tanstack/react-router";
import { Heart, Laugh, MessageSquare, Share2, Sparkles, Droplet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Lightbox } from "@/components/lightbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { relativeTime } from "@/lib/format";
import { userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import type { Memory, ReactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

const reactionMeta: { type: ReactionType; label: string; Icon: typeof Heart }[] = [
  { type: "heart", label: "Love", Icon: Heart },
  { type: "joy", label: "Joy", Icon: Laugh },
  { type: "sad", label: "Tender", Icon: Droplet },
  { type: "wow", label: "Wow", Icon: Sparkles },
];

export function MemoryCard({ memory }: { memory: Memory }) {
  const author = userById(memory.authorId);
  const toggleReaction = useAppStore((s) => s.toggleReaction);
  const addComment = useAppStore((s) => s.addComment);
  const currentUser = userById(useAppStore((s) => s.currentUserId));
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const total = Object.values(memory.reactions).reduce((a, b) => a + b, 0);
  const visibleComments = showAll ? memory.comments : memory.comments.slice(0, 2);

  return (
    <Card className="paper-edge card-lift overflow-hidden p-0">
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link to="/profile/$userId" params={{ userId: author.id }}>
          <Avatar className="size-11 ring-2 ring-gold/25">
            <AvatarImage src={author.avatarUrl} alt="" />
            <AvatarFallback>{author.firstName[0]}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to="/profile/$userId"
            params={{ userId: author.id }}
            className="font-display text-base font-semibold hover:underline"
          >
            {author.displayName}
          </Link>
          <p className="text-xs text-muted-foreground">
            {author.relationshipToViewer} · {relativeTime(memory.createdAt)}
          </p>
        </div>
      </div>

      <p className="whitespace-pre-line px-4 pb-3 text-[15px] leading-relaxed text-foreground/90">
        {memory.text}
      </p>

      {memory.taggedUserIds.length > 0 && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          with{" "}
          {memory.taggedUserIds.map((id, i) => (
            <span key={id}>
              {i > 0 && ", "}
              <Link
                to="/profile/$userId"
                params={{ userId: id }}
                className="font-medium text-primary hover:underline dark:text-gold"
              >
                {userById(id).displayName}
              </Link>
            </span>
          ))}
        </p>
      )}

      {memory.photos.length > 0 && (
        <div
          className={cn(
            "grid gap-0.5",
            memory.photos.length === 1 && "grid-cols-1",
            memory.photos.length === 2 && "grid-cols-2",
            memory.photos.length >= 3 && "grid-cols-3",
          )}
        >
          {memory.photos.slice(0, 6).map((url, i) => (
            <button
              key={url + i}
              onClick={() => setLightbox(i)}
              className="group relative aspect-4/3 overflow-hidden"
              aria-label={`Open photo ${i + 1}`}
            >
              <img
                src={url}
                alt={`Memory photo ${i + 1} shared by ${author.displayName}`}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>{total} reactions</span>
        <span>{memory.comments.length} comments</span>
      </div>

      <div className="flex items-center gap-1 border-y border-border px-2 py-1">
        {reactionMeta.map(({ type, label, Icon }) => (
          <Button
            key={type}
            variant="ghost"
            size="sm"
            onClick={() => toggleReaction(memory.id, type)}
            className={cn(
              "flex-1 gap-1.5 text-xs",
              memory.myReaction === type && "text-gold",
            )}
          >
            <Icon className={cn("size-4", memory.myReaction === type && "fill-gold/30")} />
            {label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => toast.success("Shared with the family")}>
          <Share2 className="size-4" />
          Share
        </Button>
      </div>

      <div className="space-y-3 px-4 py-3">
        {visibleComments.map((comment) => {
          const cAuthor = userById(comment.authorId);
          return (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar className="size-8">
                <AvatarImage src={cAuthor.avatarUrl} alt="" />
                <AvatarFallback>{cAuthor.firstName[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-2xl bg-muted px-3 py-2">
                <p className="text-xs font-semibold">{cAuthor.displayName}</p>
                <p className="text-sm leading-relaxed text-foreground/90">{comment.text}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(comment.createdAt)}</p>
              </div>
            </div>
          );
        })}
        {memory.comments.length > 2 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-primary hover:underline dark:text-gold"
          >
            {showAll ? "Show fewer comments" : `View all ${memory.comments.length} comments`}
          </button>
        )}

        <form
          className="flex items-center gap-2 pt-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            addComment(memory.id, draft.trim());
            setDraft("");
          }}
        >
          <Avatar className="size-8">
            <AvatarImage src={currentUser.avatarUrl} alt="" />
            <AvatarFallback>{currentUser.firstName[0]}</AvatarFallback>
          </Avatar>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a comment…"
            aria-label="Write a comment"
            className="rounded-full"
          />
          <Button type="submit" size="icon" variant="ghost" aria-label="Post comment">
            <MessageSquare className="size-4" />
          </Button>
        </form>
      </div>

      <Lightbox
        photos={memory.photos.map((url) => ({ url, caption: memory.text.slice(0, 90) }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </Card>
  );
}
