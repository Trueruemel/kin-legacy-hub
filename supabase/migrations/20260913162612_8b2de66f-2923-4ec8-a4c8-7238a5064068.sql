REVOKE ALL ON FUNCTION public.vault_object_writable(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vault_object_writable(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.vault_object_writable(text) TO authenticated;