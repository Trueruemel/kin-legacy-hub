-- Per-user assistant access scopes (used by the app's MCP tools)
CREATE TABLE public.assistant_scopes (
  user_id uuid NOT NULL PRIMARY KEY DEFAULT auth.uid(),
  allow_tree boolean NOT NULL DEFAULT true,
  allow_photos boolean NOT NULL DEFAULT false,
  allow_events boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_scopes TO authenticated;
GRANT ALL ON public.assistant_scopes TO service_role;
ALTER TABLE public.assistant_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY assistant_scopes_own ON public.assistant_scopes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER assistant_scopes_updated_at BEFORE UPDATE ON public.assistant_scopes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Per-relative visibility inside a family
CREATE TABLE public.member_visibility (
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  member_user_id uuid NOT NULL,
  allow_tree boolean NOT NULL DEFAULT true,
  allow_photos boolean NOT NULL DEFAULT true,
  allow_events boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (family_id, member_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_visibility TO authenticated;
GRANT ALL ON public.member_visibility TO service_role;
ALTER TABLE public.member_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_visibility_select ON public.member_visibility FOR SELECT TO authenticated
  USING (public.is_family_member(family_id));
CREATE POLICY member_visibility_insert ON public.member_visibility FOR INSERT TO authenticated
  WITH CHECK (public.can_admin_family(family_id));
CREATE POLICY member_visibility_update ON public.member_visibility FOR UPDATE TO authenticated
  USING (public.can_admin_family(family_id)) WITH CHECK (public.can_admin_family(family_id));
CREATE POLICY member_visibility_delete ON public.member_visibility FOR DELETE TO authenticated
  USING (public.can_admin_family(family_id));
CREATE TRIGGER member_visibility_updated_at BEFORE UPDATE ON public.member_visibility
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.member_can_see(_family_id uuid, _area text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_family_member(_family_id) THEN false
    WHEN public.can_admin_family(_family_id) THEN true
    ELSE coalesce((
      SELECT CASE _area
        WHEN 'tree' THEN v.allow_tree
        WHEN 'photos' THEN v.allow_photos
        WHEN 'events' THEN v.allow_events
        ELSE true END
      FROM public.member_visibility v
      WHERE v.family_id = _family_id AND v.member_user_id = auth.uid()
    ), true)
  END
$$;
REVOKE ALL ON FUNCTION public.member_can_see(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_can_see(uuid, text) TO authenticated;

-- Apply per-relative visibility to tree, photos and events reads
DROP POLICY persons_select ON public.persons;
CREATE POLICY persons_select ON public.persons FOR SELECT TO authenticated
  USING (public.member_can_see(family_id, 'tree'));

DROP POLICY events_select ON public.events;
CREATE POLICY events_select ON public.events FOR SELECT TO authenticated
  USING (public.member_can_see(family_id, 'events'));

DROP POLICY "Media readable by members" ON public.media_items;
CREATE POLICY media_items_select ON public.media_items FOR SELECT TO authenticated
  USING (public.member_can_see(family_id, 'photos'));
DROP POLICY "Editors manage media" ON public.media_items;
CREATE POLICY media_items_insert ON public.media_items FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_family(family_id));
CREATE POLICY media_items_update ON public.media_items FOR UPDATE TO authenticated
  USING (public.can_edit_family(family_id)) WITH CHECK (public.can_edit_family(family_id));
CREATE POLICY media_items_delete ON public.media_items FOR DELETE TO authenticated
  USING (public.can_edit_family(family_id));