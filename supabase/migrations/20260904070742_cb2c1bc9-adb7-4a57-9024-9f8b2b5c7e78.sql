-- 1. Chat membership must stay inside the family
DROP POLICY IF EXISTS chat_members_insert ON public.chat_members;
CREATE POLICY chat_members_insert ON public.chat_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_family_member(family_id)
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = chat_members.family_id
        AND fm.user_id = chat_members.user_id
    )
    AND (
      EXISTS (SELECT 1 FROM public.chats c WHERE c.id = chat_members.chat_id AND c.created_by = auth.uid())
      OR public.is_chat_member(chat_id)
    )
  );

-- 2. Internal SECURITY DEFINER helpers are not part of the public API
REVOKE EXECUTE ON FUNCTION public.can_admin_family(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_family(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.family_role_of(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_demo_family(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_family_creator(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.shares_family_with(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_object_readable(text) FROM PUBLIC, anon, authenticated;

-- 3. RPCs the app really calls stay available to signed-in users only
REVOKE EXECUTE ON FUNCTION public.vault_list(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.family_invitation_preview(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_family_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vault_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_invitation_preview(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_family_invitation(uuid) TO authenticated;