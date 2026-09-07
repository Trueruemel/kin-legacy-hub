import { createFileRoute } from "@tanstack/react-router";
import { Heart, Mic, Sparkles, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Lightbox } from "@/components/lightbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/lib/file-upload";
import { formatDate } from "@/lib/format";
import { albums as allAlbums, userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { RealGallery } from "@/components/gallery-real";
import { useActiveFamily } from "@/hooks/use-active-family";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/gallery")({
  head: () => ({
    meta: [
      { title: "Media Gallery — Eternal — Memories" },
      {
        name: "description",
        content: "Albums of family photos, scanned archives and everyday moments in one place.",
      },
      { property: "og:title", content: "Media Gallery — Eternal — Memories" },
      {
        property: "og:description",
        content: "Browse the family photo archive by album, year and storyteller.",
      },
    ],
  }),
  component: GalleryPage,
});

const MAX_MEDIA_BYTES = 6 * 1024 * 1024;

function GalleryPage() {
  const { family, loading } = useActiveFamily();
  const { user } = useAuth();
  if (loading) {
    return (
      <AppLayout wide>
        <p className="py-24 text-center text-sm text-muted-foreground">Opening your archive…</p>
      </AppLayout>
    );
  }
  if (family) {
    return (
      <AppLayout wide>
        <RealGallery
          familyId={family.id}
          uploaderName={user?.email?.split("@")[0] ?? "A family member"}
          canEdit={family.role !== "viewer"}
        />
      </AppLayout>
    );
  }
  return <DemoGallery />;
}

function DemoGallery() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const allMedia = useAppStore((s) => s.media);
  const addMediaItem = useAppStore((s) => s.addMediaItem);
  const generateStory = useAppStore((s) => s.generateStory);

  const albums = useMemo(() => allAlbums.filter((a) => a.familyId === familyId), [familyId]);
  const media = useMemo(
    () => allMedia.filter((m) => m.familyId === familyId),
    [allMedia, familyId],
  );

  const [albumId, setAlbumId] = useState<string | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [story, setStory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [writing, setWriting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () => media.filter((m) => !albumId || m.albumId === albumId),
    [media, albumId],
  );
  const photos = items.filter((i) => i.url && !i.mediaMime?.startsWith("audio/"));

  const runUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await addMediaItem({ file, caption: caption.trim(), albumId });
      setUploadOpen(false);
      setCaption("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      toast.success(
        result.transcript
          ? "Uploaded and transcribed by AI."
          : result.tags.length
            ? `Uploaded — AI tagged it: ${result.tags.slice(0, 4).join(", ")}`
            : "Uploaded to the family archive.",
      );
    } finally {
      setUploading(false);
    }
  };

  const runStory = async () => {
    setWriting(true);
    try {
      setStory(await generateStory(albumId));
    } finally {
      setWriting(false);
    }
  };

  return (
    <AppLayout wide>
      <PageHeader
        title="Media Gallery"
        description={`${media.length} items across ${albums.length} albums, stored in the private family archive.`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={writing || media.length === 0} onClick={runStory}>
              <Sparkles className="size-4" />
              {writing ? "Writing…" : "AI story"}
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" /> Upload
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={albumId === null ? "default" : "outline"}
          size="sm"
          onClick={() => setAlbumId(null)}
        >
          All media
        </Button>
        {albums.map((album) => (
          <Button
            key={album.id}
            variant={albumId === album.id ? "default" : "outline"}
            size="sm"
            onClick={() => setAlbumId(album.id)}
          >
            {album.name}
          </Button>
        ))}
      </div>

      {albumId === null && albums.length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <Card
              key={album.id}
              className="card-lift cursor-pointer overflow-hidden p-0"
              onClick={() => setAlbumId(album.id)}
            >
              {album.coverUrl && (
                <img
                  src={album.coverUrl}
                  alt={album.name}
                  loading="lazy"
                  className="aspect-16/10 w-full object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">{album.name}</h2>
                  {album.year && <Badge variant="secondary">{album.year}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{album.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="columns-2 gap-3 md:columns-3 xl:columns-4 [&>*]:mb-3">
        {items.map((item) => {
          const isAudio = item.mediaMime?.startsWith("audio/");
          if (isAudio) {
            return (
              <Card key={item.id} className="break-inside-avoid p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="size-4 text-gold" /> {item.caption}
                </p>
                {item.url && <audio controls src={item.url} className="mt-3 w-full" />}
                {item.transcript && (
                  <p className="mt-3 line-clamp-4 text-xs text-muted-foreground">
                    {item.transcript}
                  </p>
                )}
              </Card>
            );
          }
          const photoIndex = photos.findIndex((p) => p.id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => setIndex(photoIndex)}
              className="group relative block w-full break-inside-avoid overflow-hidden rounded-xl"
              aria-label={`Open photo: ${item.caption}`}
            >
              <img
                src={item.url}
                alt={item.aiCaption ?? item.caption}
                loading="lazy"
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy-deep/90 to-transparent p-3 text-left opacity-0 transition-opacity group-hover:opacity-100">
                <span className="block text-sm font-medium text-white">{item.caption}</span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                  {userById(item.uploadedBy).displayName} · {formatDate(item.takenAt)}
                  <span className="ml-auto inline-flex items-center gap-1">
                    <Heart className="size-3" /> {item.likes}
                  </span>
                </span>
                {(item.aiTags?.length ?? 0) > 0 && (
                  <span className="mt-1 block truncate text-[11px] text-gold">
                    {item.aiTags!.slice(0, 4).join(" · ")}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Lightbox
        photos={photos.map((i) => ({ url: i.url, caption: i.caption }))}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
      />

      <Dialog open={!!story} onOpenChange={(o) => !o && setStory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">The story of this collection</DialogTitle>
            <DialogDescription>
              Written by AI from the captions, tags and voice memos in the archive.
            </DialogDescription>
          </DialogHeader>
          <div className="whitespace-pre-line rounded-xl border bg-muted/40 p-5 text-sm leading-relaxed">
            {story}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add to the archive</DialogTitle>
            <DialogDescription>
              Photos are tagged by AI; voice memos are transcribed automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-caption">Caption</Label>
              <Input
                id="g-caption"
                placeholder="Grandma's kitchen, summer 1998"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-file">Photo or voice memo</Label>
              <Input
                id="g-file"
                ref={fileRef}
                type="file"
                accept="image/*,audio/*"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  if (selected && selected.size > MAX_MEDIA_BYTES) {
                    toast.error(
                      `That file is ${formatBytes(selected.size)} — the demo limit is 6 MB.`,
                    );
                    e.target.value = "";
                    return;
                  }
                  setFile(selected);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {file
                  ? `${file.name} · ${formatBytes(file.size)}`
                  : "Up to 6 MB. Stored privately, never public."}
              </p>
            </div>
            {albumId && (
              <p className="text-xs text-muted-foreground">
                It will be added to the selected album.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button disabled={uploading || !file} onClick={runUpload}>
              {uploading ? "Uploading & analysing…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
