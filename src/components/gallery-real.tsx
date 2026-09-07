import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderPlus, Mic, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoCropper } from "@/components/photo-cropper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/lib/file-upload";
import { formatDate } from "@/lib/format";
import { addMediaItem, createAlbum, listGallery } from "@/lib/gallery.functions";

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export function RealGallery({
  familyId,
  uploaderName,
  canEdit,
}: {
  familyId: string;
  uploaderName: string;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listGallery);
  const album = useServerFn(createAlbum);
  const addMedia = useServerFn(addMediaItem);

  const gallery = useQuery({
    queryKey: ["gallery", familyId],
    queryFn: () => list({ data: { familyId } }),
  });
  const albums = gallery.data?.albums ?? [];
  const items = gallery.data?.items ?? [];

  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [albumForm, setAlbumForm] = useState({ name: "", description: "", year: "" });
  const [uploading, setUploading] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["gallery", familyId] });

  const albumMutation = useMutation({
    mutationFn: () =>
      album({
        data: {
          familyId,
          name: albumForm.name.trim(),
          ...(albumForm.description.trim() ? { description: albumForm.description.trim() } : {}),
          ...(albumForm.year ? { year: Number(albumForm.year) } : {}),
        },
      }),
    onSuccess: () => {
      setAlbumOpen(false);
      setAlbumForm({ name: "", description: "", year: "" });
      void invalidate();
      toast.success("Album created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = async (file: File) => {
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error(`That file is ${formatBytes(file.size)} — the limit is 25 MB.`);
      return;
    }
    setUploading(true);
    try {
      const id = crypto.randomUUID();
      const path = `${familyId}/gallery/${id}/${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) throw new Error(error.message);
      await addMedia({
        data: {
          familyId,
          albumId: activeAlbum,
          caption: caption.trim() || file.name,
          storagePath: path,
          mime: file.type || "application/octet-stream",
          uploadedByName: uploaderName,
        },
      });
      setCaption("");
      void invalidate();
      toast.success("Saved to your family archive.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const visible = activeAlbum ? items.filter((i) => i.albumId === activeAlbum) : items;

  return (
    <>
      <PageHeader
        title="Family Gallery"
        description={
          gallery.isLoading
            ? "Opening your archive…"
            : `${items.length} files in ${albums.length} albums — stored privately, shared only with your family.`
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={activeAlbum === null ? "secondary" : "ghost"}
          onClick={() => setActiveAlbum(null)}
        >
          All files
        </Button>
        {albums.map((a) => (
          <Button
            key={a.id}
            size="sm"
            variant={activeAlbum === a.id ? "secondary" : "ghost"}
            onClick={() => setActiveAlbum(a.id)}
          >
            {a.name} <span className="text-muted-foreground">({a.count})</span>
          </Button>
        ))}
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setAlbumOpen(true)}>
            <FolderPlus className="size-4" /> New album
          </Button>
        )}
      </div>

      {canEdit && (
        <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-52 flex-1">
            <Label htmlFor="gal-caption">Caption</Label>
            <Input
              id="gal-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Grandma's 80th, the toast"
            />
          </div>
          <input
            ref={fileRef}
            id="gal-file"
            type="file"
            accept="image/*,audio/*,video/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              // Photos get a crop pass; audio, video and documents upload as-is.
              if (file.type.startsWith("image/")) setPendingPhoto(file);
              else void upload(file);
            }}
          />
          <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload to archive"}
          </Button>
        </Card>
      )}

      <PhotoCropper
        file={pendingPhoto}
        open={pendingPhoto !== null}
        aspect={4 / 3}
        title="Crop before adding to the archive"
        onCancel={() => setPendingPhoto(null)}
        onCropped={(cropped) => {
          setPendingPhoto(null);
          void upload(cropped);
        }}
      />

      {!gallery.isLoading && visible.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Upload the first photo or voice note.
        </Card>
      )}

      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
        {visible.map((item) => (
          <Card key={item.id} className="break-inside-avoid overflow-hidden p-0">
            {item.url && item.mime?.startsWith("image/") && (
              <img
                src={item.url}
                alt={item.caption}
                loading="lazy"
                className="w-full object-cover"
              />
            )}
            {item.url && item.mime?.startsWith("video/") && (
              <video controls src={item.url} className="w-full" />
            )}
            {item.url && item.mime?.startsWith("audio/") && (
              <div className="flex items-center gap-2 p-4">
                <Mic className="size-5 text-gold" />
                <audio controls src={item.url} className="w-full" />
              </div>
            )}
            {item.url && !item.mime?.match(/^(image|video|audio)\//) && (
              <div className="p-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline"
                >
                  Open file
                </a>
              </div>
            )}
            <div className="space-y-1 p-4">
              <p className="text-sm font-medium">{item.caption}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(item.takenAt)}
                {item.uploadedByName ? ` · ${item.uploadedByName}` : ""}
              </p>
              {item.transcript && (
                <p className="mt-2 rounded-lg bg-muted/60 p-2 text-xs italic">{item.transcript}</p>
              )}
              {item.aiTags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.aiTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={albumOpen} onOpenChange={setAlbumOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">New album</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="al-name">Name</Label>
              <Input
                id="al-name"
                value={albumForm.name}
                onChange={(e) => setAlbumForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="al-desc">Description</Label>
              <Input
                id="al-desc"
                value={albumForm.description}
                onChange={(e) => setAlbumForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="al-year">Year</Label>
              <Input
                id="al-year"
                type="number"
                value={albumForm.year}
                onChange={(e) => setAlbumForm((f) => ({ ...f, year: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={albumForm.name.trim().length < 2 || albumMutation.isPending}
              onClick={() => albumMutation.mutate()}
            >
              Create album
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
