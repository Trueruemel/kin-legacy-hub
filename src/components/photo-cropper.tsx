import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

/**
 * Lightweight crop dialog: drag to reposition, slide to zoom, exports a
 * square (or fixed-aspect) JPEG through a canvas — no extra dependencies.
 */
export function PhotoCropper({
  file,
  open,
  aspect = 1,
  outputSize = 1200,
  title = "Crop your photo",
  onCancel,
  onCropped,
}: {
  file: File | null;
  open: boolean;
  aspect?: number;
  outputSize?: number;
  title?: string;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const crop = useCallback(async () => {
    const image = imageRef.current;
    const frame = frameRef.current;
    if (!image || !frame || !file) return;
    setBusy(true);
    try {
      const frameRect = frame.getBoundingClientRect();
      const imageRect = image.getBoundingClientRect();
      // Map the visible frame back onto the natural pixels of the source image.
      const scale = image.naturalWidth / imageRect.width;
      const sx = Math.max(0, (frameRect.left - imageRect.left) * scale);
      const sy = Math.max(0, (frameRect.top - imageRect.top) * scale);
      const sw = Math.min(image.naturalWidth - sx, frameRect.width * scale);
      const sh = Math.min(image.naturalHeight - sy, frameRect.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = Math.round(outputSize / aspect);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Cropping is not supported in this browser.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Could not process that photo.");
      const name = file.name.replace(/\.[^.]+$/, "") + "-cropped.jpg";
      onCropped(new File([blob], name, { type: "image/jpeg" }));
    } finally {
      setBusy(false);
    }
  }, [aspect, file, onCropped, outputSize]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Drag the photo to reposition it, then zoom to frame it.
          </DialogDescription>
        </DialogHeader>

        <div
          className="relative mx-auto w-full max-w-sm touch-none overflow-hidden rounded-xl bg-muted"
          style={{ aspectRatio: String(aspect) }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && (
            <img
              ref={imageRef}
              src={src}
              alt="Photo being cropped"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                width: "100%",
              }}
            />
          )}
          <div
            ref={frameRef}
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-gold/80"
            aria-hidden
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="crop-zoom">Zoom</Label>
          <Slider
            id="crop-zoom"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([next]) => setZoom(next ?? 1)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void crop()} disabled={busy || !src}>
            {busy ? "Preparing…" : "Use this crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
