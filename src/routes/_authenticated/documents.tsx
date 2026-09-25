import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppLayout, PageHeader } from "@/components/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveFamily } from "@/hooks/use-active-family";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  addDocument,
  deleteDocument,
  listDocuments,
  MAX_DOCUMENT_BYTES,
  transcribeFamilyDocument,
  type FamilyDocument,
} from "@/lib/documents.functions";
import { formatBytes } from "@/lib/file-upload";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Historic Documents — Eternal — Memories" },
      {
        name: "description",
        content:
          "Upload old letters, certificates and diaries as photos or PDFs and get a searchable transcription and summary.",
      },
      { property: "og:title", content: "Historic Documents — Eternal — Memories" },
      {
        property: "og:description",
        content: "Searchable transcriptions and summaries of your family's historic documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

function DocumentsPage() {
  const { family, loading } = useActiveFamily();
  const { user } = useAuth();
  return (
    <AppLayout wide>
      <PageHeader
        title="Historic documents"
        description="Upload letters, certificates or diaries as a photo or PDF. We write out the text and a short summary so you can search them later."
      />
      {loading ? (
        <p className="py-24 text-center text-sm text-muted-foreground">Opening your archive…</p>
      ) : !family ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Create or join a family first to keep documents here.
        </Card>
      ) : (
        <DocumentArchive
          familyId={family.id}
          canEdit={family.role !== "viewer"}
          uploaderName={user?.email?.split("@")[0] ?? "A family member"}
        />
      )}
    </AppLayout>
  );
}

function DocumentArchive({
  familyId,
  canEdit,
  uploaderName,
}: {
  familyId: string;
  canEdit: boolean;
  uploaderName: string;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listDocuments);
  const add = useServerFn(addDocument);
  const transcribe = useServerFn(transcribeFamilyDocument);
  const remove = useServerFn(deleteDocument);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const docs = useQuery({
    queryKey: ["family-documents", familyId, search],
    queryFn: () => list({ data: { familyId, query: search || undefined } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["family-documents", familyId] });

  const runTranscribe = async (id: string) => {
    setWorking(id);
    try {
      const res = await transcribe({ data: { documentId: id } });
      if ("error" in res) toast.error(res.error);
      else toast.success("Transcription ready.");
    } catch {
      toast.error("The document could not be read right now.");
    } finally {
      setWorking(null);
      void refresh();
    }
  };

  const upload = async (file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Please choose a PDF or an image (JPG, PNG, WebP).");
      return;
    }
    if (file.size === 0) {
      toast.error("That file is empty.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(`That file is ${formatBytes(file.size)} — the limit is 10 MB.`);
      return;
    }
    setBusy(true);
    try {
      const path = `${familyId}/documents/${crypto.randomUUID()}/${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage
        .from("memories")
        .upload(path, file, { contentType: file.type });
      if (error) throw new Error(error.message);
      const { id } = await add({
        data: {
          familyId,
          title: title.trim() || file.name,
          storagePath: path,
          mime: file.type as (typeof ACCEPTED)[number] as "application/pdf",
          uploadedByName: uploaderName,
        },
      });
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      void refresh();
      void runTranscribe(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Add a document</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Title (optional)</Label>
              <Input
                id="doc-title"
                value={title}
                maxLength={160}
                placeholder="e.g. Grandma's letter from 1952"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" aria-hidden />
              {busy ? "Uploading…" : "Choose photo or PDF"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="sr-only"
              aria-label="Document file"
              accept={ACCEPTED.join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Only the document itself is sent to the AI helper — no names or other family details.
          </p>
        </Card>
      )}

      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query.trim());
        }}
      >
        <Label htmlFor="doc-search" className="sr-only">
          Search documents
        </Label>
        <Input
          id="doc-search"
          value={query}
          placeholder="Search transcriptions, summaries and titles"
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="outline">
          <Search className="mr-2 h-4 w-4" aria-hidden />
          Search
        </Button>
      </form>

      {docs.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : docs.isError ? (
        <p role="alert" className="text-sm text-destructive">
          The documents could not be loaded. Please reload the page.
        </p>
      ) : (docs.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? `Nothing found for “${search}”.` : "No documents yet."}
        </p>
      ) : (
        <ul className="space-y-4">
          {(docs.data ?? []).map((d) => (
            <DocumentCard
              key={d.id}
              doc={d}
              canEdit={canEdit}
              working={working === d.id}
              onTranscribe={() => void runTranscribe(d.id)}
              onDelete={async () => {
                if (!window.confirm("Delete this document and its transcription?")) return;
                await remove({ data: { documentId: d.id } });
                void refresh();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocumentCard({
  doc,
  canEdit,
  working,
  onTranscribe,
  onDelete,
}: {
  doc: FamilyDocument;
  canEdit: boolean;
  working: boolean;
  onTranscribe: () => void;
  onDelete: () => void;
}) {
  return (
    <li>
      <Card className="card-lift space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <h3 className="break-words font-display text-base font-semibold">{doc.title}</h3>
              <p className="text-xs text-muted-foreground">
                {doc.uploadedByName ?? "A family member"} · {formatDate(doc.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{doc.mime === "application/pdf" ? "PDF" : "Image"}</Badge>
            {doc.url && (
              <Button asChild size="sm" variant="outline">
                <a href={doc.url} target="_blank" rel="noreferrer">
                  Open original
                </a>
              </Button>
            )}
            {canEdit && (
              <>
                <Button size="sm" variant="outline" disabled={working} onClick={onTranscribe}>
                  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
                  {working ? "Reading…" : doc.status === "done" ? "Read again" : "Transcribe"}
                </Button>
                <Button size="sm" variant="ghost" aria-label="Delete document" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </>
            )}
          </div>
        </div>
        <div aria-live="polite">
          {working ? (
            <p className="text-sm text-muted-foreground">Reading the document — this can take a minute…</p>
          ) : doc.status === "failed" ? (
            <p className="text-sm text-muted-foreground">The last attempt did not work. You can try again.</p>
          ) : doc.summary || doc.transcription ? (
            <div className="space-y-3">
              {doc.summary && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </h4>
                  <p className="mt-1 text-sm">{doc.summary}</p>
                </div>
              )}
              {doc.transcription && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    Show transcription
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted/50 p-3 text-sm">
                    {doc.transcription}
                  </p>
                </details>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not transcribed yet.</p>
          )}
        </div>
      </Card>
    </li>
  );
}
