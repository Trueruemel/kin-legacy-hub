-- 1. No anonymous execution of the subscription helper
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon;

-- 2. Serialise family owner claims so concurrent inserts cannot both win
CREATE OR REPLACE FUNCTION public.family_owner_claim_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_owners integer;
BEGIN
  IF NEW.role <> 'owner'::family_role THEN
    RETURN NEW;
  END IF;

  -- Lock the family row: concurrent owner claims queue behind each other.
  PERFORM 1 FROM public.families WHERE id = NEW.family_id FOR UPDATE;

  SELECT count(*) INTO existing_owners
  FROM public.family_members
  WHERE family_id = NEW.family_id
    AND role = 'owner'::family_role
    AND user_id <> NEW.user_id;

  -- A first owner may only be claimed by the family creator when none exists.
  IF existing_owners = 0
     AND NOT public.is_family_creator(NEW.family_id)
     AND NOT public.can_admin_family(NEW.family_id) THEN
    RAISE EXCEPTION 'Only the family creator can claim ownership.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.family_owner_claim_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS family_members_owner_claim_guard ON public.family_members;
CREATE TRIGGER family_members_owner_claim_guard
BEFORE INSERT OR UPDATE OF role ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.family_owner_claim_guard();

-- 3. Sealed vault media cannot be deleted or overwritten before release
CREATE OR REPLACE FUNCTION public.vault_object_writable(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (storage.foldername(_name))[2] IS DISTINCT FROM 'vault' THEN true
    ELSE NOT EXISTS (
      SELECT 1 FROM public.vault_entries v
      WHERE v.media_path = _name
        AND NOT public.vault_is_released(v.release_rule, v.release_on, v.released, v.unlock_age)
    )
  END
$$;

GRANT EXECUTE ON FUNCTION public.vault_object_writable(text) TO authenticated;

DROP POLICY IF EXISTS memories_delete ON storage.objects;
CREATE POLICY memories_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'memories'
  AND public.can_edit_family(((storage.foldername(name))[1])::uuid)
  AND public.vault_object_writable(name)
);

DROP POLICY IF EXISTS memories_update ON storage.objects;
CREATE POLICY memories_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'memories'
  AND public.can_edit_family(((storage.foldername(name))[1])::uuid)
  AND public.vault_object_writable(name)
)
WITH CHECK (
  bucket_id = 'memories'
  AND public.can_edit_family(((storage.foldername(name))[1])::uuid)
  AND public.vault_object_writable(name)
);