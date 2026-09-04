import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, LockKeyhole, Mic, Paperclip, Plus, Sparkles, Unlock, Video, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { RealVault } from "@/components/vault-real";
import { useActiveFamily } from "@/hooks/use-active-family";
import { useAuth } from "@/hooks/use-auth";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes, MAX_UPLOAD_BYTES } from "@/lib/file-upload";
import { countdown, formatDate, formatLongDate } from "@/lib/format";
import { userById } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import type { VaultItem } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({
    meta: [
      { title: "Legacy Vault — Eternal Memories" },
      { name: "description", content: "Time-locked letters, videos and recordings sealed for the people who come next." },
      { property: "og:title", content: "Legacy Vault — Eternal Memories" },
      { property: "og:description", content: "Seal a message today; it opens on the date, birthday or moment you choose." },
    ],
  }),
  component: VaultPage,
});

const kindIcon = { message: LockKeyhole, letter: FileText, video: Video, audio: Mic } as const;

function isReleased(item: VaultItem) {
  return item.unlock.kind === "date" && new Date(item.unlock.date).getTime() <= Date.now();
}

function unlockLabel(item: VaultItem) {
  if (item.unlock.kind === "date") {
    return isReleased(item) ? "Open now" : `Unlocks ${formatLongDate(item.unlock.date)}`;
  }
  if (item.unlock.kind === "age") return `Unlocks at age ${item.unlock.age}`;
  return "Unlocks upon passing";
}

function unlockProgress(item: VaultItem) {
  if (item.unlock.kind !== "date") return null;
  const sealed = new Date(item.sealedAt).getTime();
  const target = new Date(item.unlock.date).getTime();
  return Math.round(Math.max(2, Math.min(100, ((Date.now() - sealed) / (target - sealed)) * 100)));
}

/** Real families get the backend vault; the investor demo keeps mock state. */
function VaultPage() {
  const { family, loading } = useActiveFamily();
  const { user } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <p className="py-24 text-center text-sm text-muted-foreground">Opening the vault…</p>
      </AppLayout>
    );
  }

  if (family) {
    return (
      <AppLayout>
        <RealVault
          familyId={family.id}
          sealedByName={user?.email?.split("@")[0] ?? "A family member"}
          currentUserId={user?.id ?? null}
          canAdmin={family.role === "owner" || family.role === "steward"}
        />
      </AppLayout>
    );
  }

  return <DemoVault />;
}

function DemoVault() {
  const familyId = useAppStore((s) => s.activeFamilyId);
  const allItems = useAppStore((s) => s.vault);
  const sealVaultItem = useAppStore((s) => s.sealVaultItem);

  const items = useMemo(() => allItems.filter((i) => i.familyId === familyId), [allItems, familyId]);

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", releaseOn: "2035-01-01" });
  const [file, setFile] = useState<File | null>(null);
  const [recipients, setRecipients] = useState("The family");
  const [sealing, setSealing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const detail = items.find((i) => i.id === detailId) ?? null;

  const resetForm = () => {
    setForm({ title: "", content: "", releaseOn: "2035-01-01" });
    setFile(null);
    setRecipients("The family");
    if (fileRef.current) fileRef.current.value = "";
  };

  const runSeal = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Give it a title and a message first.");
      return;
    }
    setSealing(true);
    try {
      const result = await sealVaultItem({
        title: form.title.trim(),
        content: form.content.trim(),
        releaseOn: form.releaseOn,
        recipients: recipients
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
          .slice(0, 10),
        file,
      });
      setOpen(false);
      resetForm();
      toast.success(
        result.transcript
          ? "Sealed — the recording was transcribed and locked away with it."
          : "Sealed. The content is now unreadable until the unlock date.",
      );
    } finally {
      setSealing(false);
    }
  };

  const pickFile = (selected: File | null) => {
    if (selected && selected.size > MAX_UPLOAD_BYTES) {
      toast.error(`That file is ${formatBytes(selected.size)} — the demo limit is 8 MB.`);
      return;
    }
    setFile(selected);
  };

  const sealedCount = items.filter((i) => !isReleased(i)).length;

  return (
    <AppLayout>
      <div className="relative -mx-4 mb-8 overflow-hidden bg-navy-deep px-6 py-12 text-center text-white sm:rounded-2xl">
        <LockKeyhole className="mx-auto size-10 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-semibold">The Legacy Vault</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Words for people who aren't ready to hear them yet. Sealed today, delivered exactly when
          they should be.
        </p>
        <Button className="mt-6 bg-gold text-gold-foreground hover:bg-gold/90" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Create a sealed item
        </Button>
      </div>

      <PageHeader
        title="Sealed items"
        description={`${sealedCount} of ${items.length} items are still locked. Locked content stays sealed until its moment arrives.`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const released = isReleased(item);
          const Icon = released ? Unlock : kindIcon[item.kind];
          const progress = unlockProgress(item);
          return (
            <Card key={item.id} className="card-lift cursor-pointer p-5" onClick={() => setDetailId(item.id)}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold leading-snug">{item.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Sealed by {userById(item.authorId).displayName} · {formatDate(item.sealedAt)}
                  </p>
                </div>
                <Badge variant={released ? "default" : "secondary"} className="capitalize">
                  {released ? "open" : item.kind}
                </Badge>
              </div>

              {released && item.content ? (
                <p className="mt-3 line-clamp-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">{item.content}</p>
              ) : (
                <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground select-none">
                  {item.preview}
                </p>
              )}

              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gold">{unlockLabel(item)}</p>
                {item.unlock.kind === "date" && !released && (
                  <>
                    <Progress value={progress ?? 0} />
                    <p className="text-xs text-muted-foreground">{countdown(item.unlock.date)}</p>
                  </>
                )}
                <p className="pt-1 text-xs text-muted-foreground">
                  {item.recipients.length} recipient{item.recipients.length === 1 ? "" : "s"}
                  {item.sizeLabel ? ` · ${item.sizeLabel}` : ""}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{detail.title}</DialogTitle>
                <DialogDescription>
                  Sealed by {userById(detail.authorId).displayName} on {formatLongDate(detail.sealedAt)}.
                </DialogDescription>
              </DialogHeader>
              {isReleased(detail) ? (
                <div className="whitespace-pre-line rounded-xl border bg-muted/40 p-5 text-sm leading-relaxed">
                  {detail.content ?? detail.preview}
                </div>
              ) : (
                <div className="rounded-xl border border-gold/40 bg-gold/5 p-6 text-center">
                  <LockKeyhole className="mx-auto size-8 text-gold" />
                  <p className="mt-3 font-display text-lg">{unlockLabel(detail)}</p>
                  {detail.unlock.kind === "date" && (
                    <p className="mt-1 text-sm text-muted-foreground">{countdown(detail.unlock.date)}</p>
                  )}
                  <p className="mt-4 text-sm text-muted-foreground">
                    The content stays sealed until the unlock condition is met — this view has
                    nothing to reveal before then.
                  </p>
                </div>
              )}

              {isReleased(detail) && detail.mediaUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Attachment</p>
                  {detail.mediaMime?.startsWith("image/") ? (
                    <img
                      src={detail.mediaUrl}
                      alt={detail.mediaName ?? detail.title}
                      className="max-h-72 w-full rounded-xl border object-contain"
                    />
                  ) : detail.mediaMime?.startsWith("audio/") ? (
                    <audio controls src={detail.mediaUrl} className="w-full" />
                  ) : detail.mediaMime?.startsWith("video/") ? (
                    <video controls src={detail.mediaUrl} className="max-h-72 w-full rounded-xl border" />
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <a href={detail.mediaUrl} target="_blank" rel="noreferrer">
                        <Download className="size-4" /> {detail.mediaName ?? "Open document"}
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {isReleased(detail) && detail.transcript && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-gold">
                    <Sparkles className="size-4" /> AI transcript
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{detail.transcript}</p>
                </div>
              )}

              <div className="text-sm">
                <p className="font-medium">Recipients</p>
                <p className="text-muted-foreground">
                  {detail.recipients
                    .map((r) => (r.startsWith("u_") || r.startsWith("c_") ? userById(r).displayName : r))
                    .join(", ")}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Seal something for the future</DialogTitle>
            <DialogDescription>Choose the moment it should open.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-title">Title</Label>
              <Input
                id="v-title"
                placeholder="For Noah, on his 30th birthday"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-body">Message</Label>
              <Textarea
                id="v-body"
                className="min-h-28"
                placeholder="Write it the way you'd say it."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-recipients">Recipients</Label>
              <Input
                id="v-recipients"
                placeholder="Noah, Olivia"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-file">Photo, document or recording</Label>
              <Input
                id="v-file"
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf,text/plain,audio/*,video/*"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Paperclip className="size-3.5" /> {file.name} · {formatBytes(file.size)}
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center gap-1 text-foreground underline-offset-2 hover:underline"
                    onClick={() => pickFile(null)}
                  >
                    <X className="size-3" /> remove
                  </button>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Up to 8 MB. Recordings are transcribed by AI and locked away with the message.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-date">Unlock date</Label>
              <Input
                id="v-date"
                type="date"
                value={form.releaseOn}
                onChange={(e) => setForm((f) => ({ ...f, releaseOn: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="bg-gold text-gold-foreground hover:bg-gold/90"
              disabled={sealing}
              onClick={runSeal}
            >
              {sealing ? "Sealing…" : "Seal it"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
