CREATE OR REPLACE FUNCTION public.is_chat_creator(_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists (select 1 from public.chats c where c.id = _chat_id and c.created_by = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_chat_creator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_creator(uuid) TO authenticated, service_role;

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
    AND (public.is_chat_creator(chat_id) OR public.is_chat_member(chat_id))
  );