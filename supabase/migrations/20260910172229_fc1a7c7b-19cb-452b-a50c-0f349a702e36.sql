REVOKE ALL ON FUNCTION public.family_invitation_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.families_created_by_immutable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vault_age_release_guard() FROM PUBLIC, anon, authenticated;