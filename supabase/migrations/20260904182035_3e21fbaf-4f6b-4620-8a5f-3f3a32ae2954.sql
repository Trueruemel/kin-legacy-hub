-- 1) Vault: unlock_age must never allow an early release.
CREATE OR REPLACE FUNCTION public.vault_is_released(
  _rule public.vault_release,
  _release_on date,
  _released boolean,
  _unlock_age integer
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  select case
    -- An age-based unlock cannot be evaluated from the entry alone, so such
    -- entries stay sealed until a steward explicitly releases them.
    when _unlock_age is not null then coalesce(_released, false)
    when _rule = 'immediate' then true
    when _rule = 'on_date' then _release_on is not null and _release_on <= current_date
    else coalesce(_released, false)
  end
$$;

DROP POLICY IF EXISTS vault_select ON public.vault_entries;
DROP POLICY IF EXISTS vault_delete ON public.vault_entries;

CREATE POLICY vault_select ON public.vault_entries FOR SELECT TO authenticated
USING (
  public.is_family_member(family_id)
  AND (created_by = auth.uid()
       OR public.vault_is_released(release_rule, release_on, released, unlock_age))
);

CREATE POLICY vault_delete ON public.vault_entries FOR DELETE TO authenticated
USING (
  (created_by = auth.uid() OR public.can_admin_family(family_id))
  AND public.vault_is_released(release_rule, release_on, released, unlock_age)
);

CREATE OR REPLACE FUNCTION public.vault_list(_family_id uuid)
RETURNS TABLE(id uuid, title text, kind public.vault_kind, preview_label text,
  recipient_names text[], release_rule public.vault_release, release_on date,
  released boolean, is_open boolean, sealed_at timestamptz, sealed_by_name text,
  size_label text, created_by uuid, media_mime text, media_name text,
  media_path text, content text, transcript text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select
    v.id, v.title, v.kind, v.preview_label, v.recipient_names,
    v.release_rule, v.release_on, v.released,
    public.vault_is_released(v.release_rule, v.release_on, v.released, v.unlock_age) as is_open,
    v.sealed_at, v.sealed_by_name, v.size_label, v.created_by,
    v.media_mime, v.media_name,
    case when public.vault_is_released(v.release_rule, v.release_on, v.released, v.unlock_age) then v.media_path end,
    case when public.vault_is_released(v.release_rule, v.release_on, v.released, v.unlock_age) then v.content end,
    case when public.vault_is_released(v.release_rule, v.release_on, v.released, v.unlock_age) then v.transcript end
  from public.vault_entries v
  where v.family_id = _family_id
    and public.is_family_member(_family_id)
  order by v.sealed_at desc
$$;

CREATE OR REPLACE FUNCTION public.vault_object_readable(_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select case
    when (storage.foldername(_name))[2] is distinct from 'vault' then true
    else exists (
      select 1 from public.vault_entries v
      where v.media_path = _name
        and public.vault_is_released(v.release_rule, v.release_on, v.released, v.unlock_age)
    )
  end
$$;

CREATE OR REPLACE FUNCTION public.vault_object_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
begin
  if tg_op = 'DELETE' then
    if not public.vault_is_released(old.release_rule, old.release_on, old.released, old.unlock_age) then
      raise exception 'Sealed vault entries cannot be deleted before release';
    end if;
    return old;
  end if;

  if new.content is distinct from old.content
     or new.media_path is distinct from old.media_path
     or new.kind is distinct from old.kind
     or new.release_rule is distinct from old.release_rule
     or new.transcript is distinct from old.transcript then
    raise exception 'Sealed vault content is immutable';
  end if;

  if new.unlock_age is distinct from old.unlock_age
     and (new.unlock_age is null or old.unlock_age is null or new.unlock_age < old.unlock_age) then
    raise exception 'An unlock age can only be raised, never lowered or removed';
  end if;

  if new.release_on is distinct from old.release_on
     and (new.release_on is null or old.release_on is null or new.release_on < old.release_on) then
    raise exception 'A release date can only be postponed, never brought forward';
  end if;

  return new;
end;
$$;

DROP FUNCTION IF EXISTS public.vault_is_released(public.vault_release, date, boolean);

-- 2) user_roles: only admins may write; reads stay own-row only.
CREATE POLICY user_roles_insert_admin ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_update_admin ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY user_roles_delete_admin ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) SECURITY DEFINER surface: nothing callable by PUBLIC/anon; signed-in users
--    keep only what RLS policies and the app's own RPCs require.
DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname NOT LIKE 'gtrgm%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.sig);
    IF fn.proname IN (
      -- used inside RLS policy expressions (evaluated as the caller)
      'can_admin_family','can_edit_family','family_role_of','has_role',
      'is_chat_member','is_family_creator','is_family_member','is_demo_family',
      'member_can_see','shares_family_with','vault_object_readable',
      -- intentional RPCs called by the app on behalf of the signed-in user
      'accept_family_invitation','family_invitation_preview','vault_list'
    ) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.sig);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.vault_is_released(public.vault_release, date, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vault_is_released(public.vault_release, date, boolean, integer) TO authenticated, service_role;