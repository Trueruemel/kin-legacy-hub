import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, LockKeyhole, Mic, Paperclip, Plus, Sparkles, Unlock, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-layout";
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
import { supabase } from "@/integrations/supabase/client";
import { formatBytes } from "@/lib/file-upload";
import { countdown, formatDate, formatLongDate } from "@/lib/format";
import {
  listVault,
  releaseVaultEntry,
  sealVaultEntry,
  vaultMediaUrl,
  vaultStory,
  type RealVaultItem,
} from "@/lib/vault.functions";

const MAX_VAULT_BYTES = 25 * 1024 * 1024;
const kindIcon = { message: LockKeyhole, letter: FileText, video: Video, audio: Mic } as const;

/** Ticking clock so countdowns run live and items open by themselves. */
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function remaining(targetIso: string, now: number) {
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return "Unlocking…";
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const mins = Math.floor((s % 3_600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) return `${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}

function Countdown({ item, now }: { item: RealVaultItem; now: number }) {
  if (!item.releaseOn) return null;
  return (
    <p className="font-mono text-xs tabular-nums text-muted-foreground">
      {remaining(item.releaseOn, now)}
    </p>
  );
}

function progressFor(item: RealVaultItem) {
  if (!item.releaseOn) return 0;
  const sealed = new Date(item.sealedAt).getTime();
  const target = new Date(item.releaseOn).getTime();
  return Math.round(Math.max(2, Math.min(100, ((Date.now() - sealed) / (target - sealed)) * 100)));
}

function AttachmentView({ item }: { item: RealVaultItem }) {
  const getUrl = useServerFn(vaultMediaUrl);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!item.isOpen || !item.hasMedia) return;
    void getUrl({ data: { entryId: item.id } })
      .then((r) => alive && setUrl(r.url))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [item.id, item.isOpen, item.hasMedia, getUrl]);

  if (!item.isOpen || !item.hasMedia) return null;
  if (!url) return <p className="text-sm text-muted-foreground">Loading attachment…</p>;

  const mime = item.mediaMime ?? "";
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Attachment</p>
      {mime.startsWith("image/") ? (
        <img
          src={url}
          alt={item.mediaName ?? item.title}
          className="max-h-72 w-full rounded-xl border object-contain"
        />
      ) : mime.startsWith("audio/") ? (
        <audio controls src={url} className="w-full" />
      ) : mime.startsWith("video/") ? (
        <video controls src={url} className="max-h-72 w-full rounded-xl border" />
      ) : (
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            <Download className="size-4" /> {item.mediaName ?? "Download"}
          </a>
        </Button>
      )}
    </div>
  );
}

/** On-demand AI retelling of an already released item. */
function VaultStory({ item }: { item: RealVaultItem }) {
  const story = useServerFn(vaultStory);
  const [text, setText] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => story({ data: { entryId: item.id } }),
    onSuccess: (r) => setText(r.story),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!item.isOpen) return null;
  return (
    <div className="space-y-2">
      {text ? (
        <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 text-sm leading-relaxed">
          <p className="mb-1 font-display text-base text-gold">AI story</p>
          {text}
        </div>
      ) : (
        <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          <Sparkles className="size-4" /> {mutation.isPending ? "Writing…" : "Retell as a story"}
        </Button>
      )}
    </div>
  );
}

export function RealVault({

  familyId,
  sealedByName,
  currentUserId,
  canAdmin,
}: {
  familyId: string;
  sealedByName: string;
  currentUserId?: string | null;
  canAdmin?: boolean;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listVault);
  const seal = useServerFn(sealVaultEntry);
  const release = useServerFn(releaseVaultEntry);
  const now = useNow();

  const vault = useQuery({
    queryKey: ["vault", familyId],
    queryFn: () => list({ data: { familyId } }),
  });
  const items = vault.data ?? [];

  // Automatic release: as soon as an unlock date passes, refetch so the
  // server hands out the content it was withholding until now.
  const dueAt = items
    .filter((i) => !i.isOpen && i.releaseOn)
    .map((i) => new Date(i.releaseOn as string).getTime())
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    if (!dueAt || dueAt > now) return;
    void queryClient.invalidateQueries({ queryKey: ["vault", familyId] });
  }, [dueAt, now, queryClient, familyId]);

  const releaseMutation = useMutation({
    mutationFn: (entryId: string) => release({ data: { entryId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vault", familyId] });
      toast.success("Released. Everyone in the family can read it now.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const mayRelease = (item: RealVaultItem) =>
    !item.isOpen && (canAdmin === true || (!!currentUserId && item.createdBy === currentUserId));

  const [open, setOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", releaseOn: "2035-01-01" });
  const [recipients, setRecipients] = useState("The family");
  const [file, setFile] = useState<File | null>(null);
  const [sealing, setSealing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const detail = items.find((i) => i.id === detailId) ?? null;

  const mutation = useMutation({
    mutationFn: async () => {
      const id = crypto.randomUUID();
      let media: { path: string; mime: string; name: string; size: number } | null = null;
      if (file) {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${familyId}/vault/${id}/${safeName}`;
        const { error } = await supabase.storage
          .from("memories")
          .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
        if (error) throw new Error(error.message);
        media = {
          path,
          mime: file.type || "application/octet-stream",
          name: file.name,
          size: file.size,
        };
      }
      return seal({
        data: {
          id,
          familyId,
          title: form.title.trim(),
          content: form.content.trim(),
          releaseOn: form.releaseOn,
          recipients: recipients.split(",").map((r) => r.trim()).filter(Boolean).slice(0, 10),
          sealedByName,
          media,
        },
      });
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", content: "", releaseOn: "2035-01-01" });
      setFile(null);
      setRecipients("The family");
      if (fileRef.current) fileRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["vault", familyId] });
      toast.success("Sealed. It is now write-protected until the unlock date.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const runSeal = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Give it a title and a message first.");
      return;
    }
    setSealing(true);
    try {
      await mutation.mutateAsync();
    } finally {
      setSealing(false);
    }
  };

  const pickFile = (selected: File | null) => {
    if (selected && selected.size > MAX_VAULT_BYTES) {
      toast.error(`That file is ${formatBytes(selected.size)} — the limit is 25 MB.`);
      return;
    }
    setFile(selected);
  };

  const sealedCount = items.filter((i) => !i.isOpen).length;

  return (
    <>
      <div className="relative -mx-4 mb-8 overflow-hidden bg-navy-deep px-6 py-12 text-center text-white sm:rounded-2xl">
        <LockKeyhole className="mx-auto size-10 text-gold" />
        <h1 className="mt-4 font-display text-3xl font-semibold">The Legacy Vault</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/70">
          Stored in your family's private archive. Files and words are unreadable — even to us —
          until the moment you chose.
        </p>
        <Button className="mt-6 bg-gold text-gold-foreground hover:bg-gold/90" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Create a sealed item
        </Button>
      </div>

      <PageHeader
        title="Sealed items"
        description={
          vault.isLoading
            ? "Opening the vault…"
            : `${sealedCount} of ${items.length} items are still locked.`
        }
      />

      {!vault.isLoading && items.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nothing sealed yet. The first letter you write here will outlive this decade.
        </Card>
      )}

      <div className="space-y-5">
        {items.map((item) => {
          const Icon = item.isOpen ? Unlock : kindIcon[item.kind];
          return (
            <article
              key={item.id}
              onClick={() => setDetailId(item.id)}
              className="index-card group relative cursor-pointer pl-12 pr-5 pb-5 pt-4 transition-transform hover:-translate-y-0.5"
            >
              {/* card-index tab */}
              <span className="absolute -top-3 left-10 flex items-center gap-1.5 rounded-t-md border border-b-0 border-border bg-card px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                <Icon className="size-3 text-gold" />
                {item.isOpen ? "open" : item.kind}
              </span>

              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-xl font-semibold leading-snug">{item.title}</h2>
                <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {formatDate(item.sealedAt)} · {item.sealedByName}
                </p>
              </div>

              <p
                className={
                  item.isOpen && item.content
                    ? "mt-3 line-clamp-3 text-[15px] leading-7"
                    : "mt-3 select-none text-[15px] leading-7 text-muted-foreground"
                }
              >
                {item.isOpen && item.content ? item.content : item.preview}
              </p>

              <div className="mt-4 space-y-2 border-t border-dashed border-border pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gold">
                    {item.isOpen
                      ? "Open now"
                      : item.releaseOn
                        ? `Unlocks ${formatLongDate(item.releaseOn)}`
                        : "Unlocks upon confirmation"}
                  </p>
                  {!item.isOpen && item.releaseOn && <Countdown item={item} now={now} />}
                </div>
                {!item.isOpen && item.releaseOn && (
                  <>
                    <Progress value={progressFor(item)} />
                    <p className="text-xs text-muted-foreground">{countdown(item.releaseOn)}</p>
                  </>
                )}
                {mayRelease(item) && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={releaseMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      releaseMutation.mutate(item.id);
                    }}
                  >
                    <Unlock className="size-4" /> Release now
                  </Button>
                )}
                <p className="pt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {item.recipients.length} recipient{item.recipients.length === 1 ? "" : "s"}
                  {item.sizeLabel ? ` · ${item.sizeLabel}` : ""}
                </p>
              </div>
            </article>
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
                  Sealed by {detail.sealedByName} on {formatLongDate(detail.sealedAt)}.
                </DialogDescription>
              </DialogHeader>
              {detail.isOpen ? (
                <>
                  <div className="index-card whitespace-pre-line py-4 pl-12 pr-5 text-[15px] leading-7">
                    {detail.content ?? detail.preview}
                    {detail.transcript && (
                      <>
                        {"\n\n"}
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          Transcript
                        </span>
                        {"\n"}
                        <span className="italic">{detail.transcript}</span>
                      </>
                    )}
                  </div>
                  <VaultStory item={detail} />
                </>
              ) : (

                <div className="rounded-xl border border-gold/40 bg-gold/5 p-6 text-center">
                  <LockKeyhole className="mx-auto size-8 text-gold" />
                  <p className="mt-3 font-display text-lg">
                    {detail.releaseOn ? `Unlocks ${formatLongDate(detail.releaseOn)}` : "Sealed"}
                  </p>
                  {detail.releaseOn && (
                    <>
                      <p className="mt-1 text-sm text-muted-foreground">{countdown(detail.releaseOn)}</p>
                      <p className="mt-1 font-mono text-lg tabular-nums text-gold">
                        {remaining(detail.releaseOn, now)}
                      </p>
                    </>
                  )}
                  <p className="mt-4 text-sm text-muted-foreground">
                    The content and any attached file stay locked in the private archive until the
                    unlock date — the server refuses to hand them out before then.
                  </p>
                  {mayRelease(detail) && (
                    <Button
                      className="mt-4 bg-gold text-gold-foreground hover:bg-gold/90"
                      disabled={releaseMutation.isPending}
                      onClick={() => releaseMutation.mutate(detail.id)}
                    >
                      <Unlock className="size-4" />
                      {releaseMutation.isPending ? "Releasing…" : "Release now"}
                    </Button>
                  )}
                </div>
              )}

              <AttachmentView item={detail} />


              <div className="text-sm">
                <p className="font-medium">Recipients</p>
                <p className="text-muted-foreground">{detail.recipients.join(", ") || "The family"}</p>
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
              <Label htmlFor="rv-title">Title</Label>
              <Input
                id="rv-title"
                placeholder="For Noah, on his 30th birthday"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rv-body">Message</Label>
              <Textarea
                id="rv-body"
                className="min-h-28"
                placeholder="Write it the way you'd say it."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rv-recipients">Recipients</Label>
              <Input
                id="rv-recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rv-file">Photo, document or recording</Label>
              <Input
                id="rv-file"
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
                  Up to 25 MB. Stored privately and write-protected once sealed.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rv-date">Unlock date</Label>
              <Input
                id="rv-date"
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
    </>
  );
}
