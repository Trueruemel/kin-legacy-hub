revoke all on function public.vault_list(uuid) from public;
revoke all on function public.vault_list(uuid) from anon;
grant execute on function public.vault_list(uuid) to authenticated;
grant execute on function public.vault_list(uuid) to service_role;