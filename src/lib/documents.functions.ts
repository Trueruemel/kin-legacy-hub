import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { transcribeDocument } from "./document-insight";
import { throwSafe } from "./safe-error";

export type FamilyDocument = {
  id: string;
  title: string;
  mime: string;
  url: string | null;
  uploadedByName: string | null;
  transcription: string | null;
  summary: string | null;
  status: "pending" | "done" | "failed";
  createdAt: string;
};

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ familyId: z.string().uuid(), query: z.string().trim().max(120).optional() })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<FamilyDocument[]> => {
    const { supabase } = context;
    let q = supabase
      .from("family_documents")
      .select("id, title, mime, storage_path, uploaded_by_name, transcription, summary, status, created_at")
      .eq("family_id", data.familyId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.query) {
      q = q.textSearch("search", data.query, { type: "websearch", config: "simple" });
    }
    const { data: rows, error } = await q;
    if (error) throwSafe(error, "listDocuments");
    const paths = (rows ?? []).map((r) => r.storage_path);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabase.storage.from("memories").createSignedUrls(paths, 900);
      for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
    return (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      mime: r.mime,
      url: signed.get(r.storage_path) ?? null,
      uploadedByName: r.uploaded_by_name,
      transcription: r.transcription,
      summary: r.summary,
      status: r.status as FamilyDocument["status"],
      createdAt: r.created_at,
    }));
  });

export const addDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        familyId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        storagePath: z.string().min(3).max(400),
        mime: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]),
        uploadedByName: z.string().trim().min(1).max(80),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!data.storagePath.startsWith(`${data.familyId}/documents/`)) {
      throw new Error("Invalid file location.");
    }
    const { data: row, error } = await context.supabase
      .from("family_documents")
      .insert({
        family_id: data.familyId,
        title: data.title,
        storage_path: data.storagePath,
        mime: data.mime,
        uploaded_by: context.userId,
        uploaded_by_name: data.uploadedByName,
      })
      .select("id")
      .single();
    if (error) throwSafe(error, "addDocument");
    return { id: row.id };
  });

export const transcribeFamilyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { supabase } = context;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { error: "The AI helper is not switched on for this site yet." };

    const { data: doc, error } = await supabase
      .from("family_documents")
      .select("id, title, storage_path, mime")
      .eq("id", data.documentId)
      .maybeSingle();
    if (error) throwSafe(error, "transcribeFamilyDocument");
    if (!doc) return { error: "That document is not available to you." };

    let source: Parameters<typeof transcribeDocument>[0];
    if (doc.mime === "application/pdf") {
      const { data: blob, error: dlError } = await supabase.storage
        .from("memories")
        .download(doc.storage_path);
      if (dlError || !blob) return { error: "That document could not be opened." };
      if (blob.size > MAX_DOCUMENT_BYTES) return { error: "That PDF is too large (max 10 MB)." };
      const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      if (!base64) return { error: "That PDF is empty." };
      source = { kind: "pdf", filename: `${doc.title.replace(/[^\w.-]+/g, "_")}.pdf`, base64 };
    } else {
      const { data: signed } = await supabase.storage
        .from("memories")
        .createSignedUrl(doc.storage_path, 600);
      if (!signed?.signedUrl) return { error: "That document could not be opened." };
      source = { kind: "image", url: signed.signedUrl };
    }

    const result = await transcribeDocument(source, { apiKey, fetchImpl: fetch });
    if ("failure" in result) {
      await supabase.from("family_documents").update({ status: "failed" }).eq("id", doc.id);
      const msg: Record<typeof result.failure, string> = {
        rate_limited: "The AI helper is busy right now — please try again in a moment.",
        no_credits: "The AI helper has run out of credit for this site.",
        denied: "The AI helper declined to read this document.",
        empty: "No readable text was found in this document.",
        unavailable: "The AI helper could not read this document right now.",
      };
      return { error: msg[result.failure] };
    }
    const { error: saveError } = await supabase
      .from("family_documents")
      .update({ transcription: result.transcription, summary: result.summary, status: "done" })
      .eq("id", doc.id);
    if (saveError) throwSafe(saveError, "transcribeFamilyDocument");
    return { ok: true };
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: doc } = await supabase
      .from("family_documents")
      .select("storage_path")
      .eq("id", data.documentId)
      .maybeSingle();
    const { error } = await supabase.from("family_documents").delete().eq("id", data.documentId);
    if (error) throwSafe(error, "deleteDocument");
    if (doc) await supabase.storage.from("memories").remove([doc.storage_path]);
    return { ok: true };
  });
