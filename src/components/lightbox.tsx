import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type LightboxPhoto = { url: string; caption?: string };

export function Lightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (index === null) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previous?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index === null]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (focusables && focusables.length > 0) {
          const first = focusables[0]!;
          const last = focusables[focusables.length - 1]!;
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (!dialogRef.current?.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
      if (e.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndexChange]);

  if (index === null || !photos[index]) return null;
  const current = photos[index];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-100 flex items-center justify-center bg-navy-deep/95 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label="Close viewer"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {photos.length > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + photos.length) % photos.length);
            }}
            className="absolute left-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % photos.length);
            }}
            className="absolute right-4 top-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
      <figure className="max-h-full" onClick={(e) => e.stopPropagation()}>
        <img
          src={current.url}
          alt={current.caption ?? "Family photo"}
          className="mx-auto max-h-[80vh] rounded-lg object-contain shadow-2xl"
        />
        {current.caption && (
          <figcaption className="mt-3 text-center text-sm text-white/80">
            {current.caption}
          </figcaption>
        )}
        <p className="mt-1 text-center text-xs text-white/50">
          {index + 1} / {photos.length}
        </p>
      </figure>
    </div>
  );
}
