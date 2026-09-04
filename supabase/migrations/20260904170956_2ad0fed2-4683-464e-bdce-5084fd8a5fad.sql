GRANT EXECUTE ON FUNCTION public.can_admin_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_family(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.family_role_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_family_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vault_object_readable(text) TO authenticated;