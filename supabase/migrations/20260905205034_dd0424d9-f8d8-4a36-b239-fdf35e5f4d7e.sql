-- Only an existing owner may grant or remove the owner role.
DROP POLICY IF EXISTS family_members_update ON public.family_members;
CREATE POLICY family_members_update ON public.family_members
  FOR UPDATE TO authenticated
  USING (
    public.can_admin_family(family_id)
    AND (role <> 'owner'::family_role OR public.family_role_of(family_id) = 'owner'::family_role)
  )
  WITH CHECK (
    public.can_admin_family(family_id)
    AND (role <> 'owner'::family_role OR public.family_role_of(family_id) = 'owner'::family_role)
  );

DROP POLICY IF EXISTS family_members_insert ON public.family_members;
CREATE POLICY family_members_insert ON public.family_members
  FOR INSERT TO authenticated
  WITH CHECK (
    ((user_id = auth.uid()) AND (role = 'owner'::family_role) AND public.is_family_creator(family_id))
    OR (
      public.can_admin_family(family_id)
      AND (role <> 'owner'::family_role OR public.family_role_of(family_id) = 'owner'::family_role)
    )
  );

DROP POLICY IF EXISTS family_members_delete ON public.family_members;
CREATE POLICY family_members_delete ON public.family_members
  FOR DELETE TO authenticated
  USING (
    (user_id = auth.uid())
    OR (
      public.can_admin_family(family_id)
      AND (role <> 'owner'::family_role OR public.family_role_of(family_id) = 'owner'::family_role)
    )
  );

-- Unused internal helper: no signed-in caller needs to run it directly.
REVOKE ALL ON FUNCTION public.is_demo_family(uuid) FROM authenticated, anon, PUBLIC;