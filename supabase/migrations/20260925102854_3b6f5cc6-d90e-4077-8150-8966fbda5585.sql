CREATE TABLE public.family_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  title text NOT NULL,
  storage_path text NOT NULL,
  mime text NOT NULL,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  uploaded_by_name text,
  transcription text,
  summary text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed')),
  search tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(transcription,''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX family_documents_search_idx ON public.family_documents USING gin(search);
CREATE INDEX family_documents_family_idx ON public.family_documents(family_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_documents TO authenticated;
GRANT ALL ON public.family_documents TO service_role;
ALTER TABLE public.family_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY family_documents_select ON public.family_documents FOR SELECT TO authenticated USING (public.is_family_member(family_id));
CREATE POLICY family_documents_insert ON public.family_documents FOR INSERT TO authenticated WITH CHECK (public.can_edit_family(family_id) AND uploaded_by = auth.uid() AND storage_path LIKE family_id::text || '/documents/%');
CREATE POLICY family_documents_update ON public.family_documents FOR UPDATE TO authenticated USING (public.can_edit_family(family_id)) WITH CHECK (public.can_edit_family(family_id));
CREATE POLICY family_documents_delete ON public.family_documents FOR DELETE TO authenticated USING (public.can_edit_family(family_id) AND (uploaded_by = auth.uid() OR public.can_edit_family(family_id)));