import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Image as ImageIcon, Send } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  addComment,
  createPost,
  listFeed,
  toggleReaction,
  type FeedPost,
} from "@/lib/feed.functions";
import { formatBytes } from "@/lib/file-upload";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const REACTIONS: { key: "heart" | "joy" | "sad" | "wow"; emoji: string }[] = [
  { key: "heart", emoji: "❤️" },
  { key: "joy", emoji: "😊" },
  { key: "sad", emoji: "🥹" },
  { key: "wow", emoji: "✨" },
];

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "F";
}

function PostCard({ post, familyId }: { post: FeedPost; familyId: string }) {
  const queryClient = useQueryClient();
  const react = useServerFn(toggleReaction);
  const comment = useServerFn(addComment);
  const [draft, setDraft] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["feed", familyId] });

  const reactMutation = useMutation({
    mutationFn: (reaction: "heart" | "joy" | "sad" | "wow") =>
      react({ data: { familyId, postId: post.id, reaction } }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => comment({ data: { familyId, postId: post.id, text } }),
    onSuccess: () => {
      setDraft("");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="paper-edge p-4">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          {post.authorAvatar && <AvatarImage src={post.authorAvatar} alt="" />}
          <AvatarFallback>{initials(post.authorName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium leading-tight">{post.authorName}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(post.createdAt)}</p>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{post.text}</p>

      {post.photos.length > 0 && (
        <div
          className={cn("mt-3 grid gap-1", post.photos.length > 1 ? "grid-cols-2" : "grid-cols-1")}
        >
          {post.photos.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              className="w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {REACTIONS.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant={post.myReaction === r.key ? "secondary" : "ghost"}
            disabled={reactMutation.isPending}
            onClick={() => reactMutation.mutate(r.key)}
          >
            <span aria-hidden>{r.emoji}</span>
            <span className="tabular-nums">{post.reactions[r.key] ?? 0}</span>
          </Button>
        ))}
      </div>

      {post.comments.length > 0 && (
        <>
          <Separator className="my-3" />
          <ul className="space-y-3">
            {post.comments.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Avatar className="size-7">
                  {c.authorAvatar && <AvatarImage src={c.authorAvatar} alt="" />}
                  <AvatarFallback>{initials(c.authorName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                  <span className="font-medium">{c.authorName}</span>{" "}
                  <span className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</span>
                  <p className="mt-0.5">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) commentMutation.mutate(draft.trim());
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
          aria-label="Write a comment"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send comment"
          className="min-h-11 min-w-11"
          disabled={!draft.trim() || commentMutation.isPending}
        >
          <Send className="size-4" />
        </Button>
      </form>
    </Card>
  );
}

export function RealFeed({ familyId, familyName }: { familyId: string; familyName: string }) {
  const queryClient = useQueryClient();
  const list = useServerFn(listFeed);
  const post = useServerFn(createPost);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const feed = useQuery({
    queryKey: ["feed", familyId],
    queryFn: () => list({ data: { familyId } }),
  });

  const postMutation = useMutation({
    mutationFn: () => post({ data: { familyId, text: text.trim(), photos } }),
    onSuccess: () => {
      setText("");
      setPhotos([]);
      void queryClient.invalidateQueries({ queryKey: ["feed", familyId] });
      toast.success("Shared with your family.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = async (file: File) => {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error(`That photo is ${formatBytes(file.size)} — the limit is 15 MB.`);
      return;
    }
    setUploading(true);
    try {
      const path = `${familyId}/feed/${crypto.randomUUID()}/${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw new Error(error.message);
      const { data: signed, error: signError } = await supabase.storage
        .from("memories")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signError) throw new Error(signError.message);
      if (signed?.signedUrl) setPhotos((p) => [...p, signed.signedUrl]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const posts = feed.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[42rem] space-y-4">
      <PageHeader
        title={familyName}
        description={
          feed.isLoading ? "Loading your family feed…" : `${posts.length} memories shared so far.`
        }
      />

      <Card className="paper-edge p-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share a memory with your family…"
          aria-label="Share a memory"
          className="min-h-20 resize-none border-none bg-muted/60 text-[15px] focus-visible:ring-1"
        />
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-1">
            {photos.map((p) => (
              <img key={p} src={p} alt="" className="aspect-4/3 w-full rounded-md object-cover" />
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <input
            ref={fileRef}
            id="feed-photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <ImageIcon className="size-4" /> {uploading ? "Uploading…" : "Photo"}
          </Button>
          <Button
            size="sm"
            disabled={!text.trim() || postMutation.isPending}
            onClick={() => postMutation.mutate()}
          >
            Share memory
          </Button>
        </div>
      </Card>

      {!feed.isLoading && posts.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No memories yet. Write the first one — it starts your family's archive.
        </Card>
      )}

      {posts.map((p) => (
        <PostCard key={p.id} post={p} familyId={familyId} />
      ))}
    </div>
  );
}
