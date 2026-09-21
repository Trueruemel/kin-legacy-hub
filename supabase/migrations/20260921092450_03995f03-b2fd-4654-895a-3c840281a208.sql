alter table public.media_items
  add column if not exists ai_description text,
  add column if not exists ai_questions text[] not null default '{}'::text[];

alter table public.vault_entries
  add column if not exists access_expires_at timestamptz;

create or replace function public.vault_is_open(
  _rule vault_release,
  _release_on date,
  _released boolean,
  _unlock_age integer,
  _access_expires_at timestamptz
) returns boolean
language sql
stable
set search_path to 'public'
as $$
  select public.vault_is_released(_rule, _release_on, _released, _unlock_age)
     and (_access_expires_at is null or _access_expires_at > now())
$$;

revoke all on function public.vault_is_open(vault_release, date, boolean, integer, timestamptz) from public;
revoke all on function public.vault_is_open(vault_release, date, boolean, integer, timestamptz) from anon;
grant execute on function public.vault_is_open(vault_release, date, boolean, integer, timestamptz) to authenticated;
grant execute on function public.vault_is_open(vault_release, date, boolean, integer, timestamptz) to service_role;

drop function if exists public.vault_list(uuid);

create function public.vault_list(_family_id uuid)
 returns table(id uuid, title text, kind vault_kind, preview_label text, recipient_names text[], release_rule vault_release, release_on date, released boolean, is_open boolean, sealed_at timestamp with time zone, sealed_by_name text, size_label text, created_by uuid, media_mime text, media_name text, media_path text, content text, transcript text, access_expires_at timestamptz)
 language sql
 stable security definer
 set search_path to 'public'
as $$
  select
    v.id, v.title, v.kind, v.preview_label, v.recipient_names,
    v.release_rule, v.release_on, v.released,
    public.vault_is_open(v.release_rule, v.release_on, v.released, v.unlock_age, v.access_expires_at) as is_open,
    v.sealed_at, v.sealed_by_name, v.size_label, v.created_by,
    v.media_mime, v.media_name,
    case when public.vault_is_open(v.release_rule, v.release_on, v.released, v.unlock_age, v.access_expires_at) then v.media_path end,
    case when public.vault_is_open(v.release_rule, v.release_on, v.released, v.unlock_age, v.access_expires_at) then v.content end,
    case when public.vault_is_open(v.release_rule, v.release_on, v.released, v.unlock_age, v.access_expires_at) then v.transcript end,
    v.access_expires_at
  from public.vault_entries v
  where v.family_id = _family_id
    and public.is_family_member(_family_id)
  order by v.sealed_at desc
$$;

create table if not exists public.vault_access_log (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.vault_entries(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  actor_name text,
  action text not null check (action in ('opened', 'downloaded', 'released', 'expiry_changed')),
  created_at timestamptz not null default now()
);

grant select, insert on public.vault_access_log to authenticated;
grant all on public.vault_access_log to service_role;

alter table public.vault_access_log enable row level security;

drop policy if exists "Family members read the vault access log" on public.vault_access_log;
create policy "Family members read the vault access log"
  on public.vault_access_log for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists "Members record their own vault access" on public.vault_access_log;
create policy "Members record their own vault access"
  on public.vault_access_log for insert to authenticated
  with check (user_id = auth.uid() and public.is_family_member(family_id));

create index if not exists idx_vault_access_log_entry on public.vault_access_log (entry_id, created_at desc);
create index if not exists idx_vault_access_log_family on public.vault_access_log (family_id, created_at desc);