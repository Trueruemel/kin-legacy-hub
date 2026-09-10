-- 1) Invitations are write-once in their essential fields.
CREATE OR REPLACE FUNCTION public.family_invitation_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.family_id <> OLD.family_id
     OR lower(NEW.email) <> lower(OLD.email)
     OR NEW.role <> OLD.role
     OR NEW.token <> OLD.token
     OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'Invitations cannot be modified after they are sent';
  END IF;
  IF OLD.accepted AND NOT NEW.accepted THEN
    RAISE EXCEPTION 'A used invitation cannot be reopened';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS family_invitation_guard ON public.family_invitations;
CREATE TRIGGER family_invitation_guard
BEFORE UPDATE ON public.family_invitations
FOR EACH ROW EXECUTE FUNCTION public.family_invitation_guard();

-- 2) families.created_by is immutable: it is the sole gate for the creator-owner path.
CREATE OR REPLACE FUNCTION public.families_created_by_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'The creator of a family cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS families_created_by_immutable ON public.families;
CREATE TRIGGER families_created_by_immutable
BEFORE UPDATE ON public.families
FOR EACH ROW EXECUTE FUNCTION public.families_created_by_immutable();

-- 3) The creator may only take ownership while the family has no owner yet.
CREATE OR REPLACE FUNCTION public.family_has_owner(_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members m
    WHERE m.family_id = _family_id AND m.role = 'owner'
  )
$$;

REVOKE ALL ON FUNCTION public.family_has_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_has_owner(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS family_members_insert ON public.family_members;
CREATE POLICY family_members_insert ON public.family_members
FOR INSERT TO authenticated
WITH CHECK (
  (
    user_id = auth.uid()
    AND role = 'owner'
    AND is_family_creator(family_id)
    AND NOT family_has_owner(family_id)
  )
  OR (
    can_admin_family(family_id)
    AND (role <> 'owner' OR family_role_of(family_id) = 'owner')
  )
);

-- 4) Age-gated vault entries may only be released by a family owner.
CREATE OR REPLACE FUNCTION public.vault_age_release_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.unlock_age IS NOT NULL
     AND coalesce(NEW.released, false)
     AND NOT coalesce(OLD.released, false)
     AND public.family_role_of(NEW.family_id) IS DISTINCT FROM 'owner'::family_role THEN
    RAISE EXCEPTION 'Only the family owner can release an age-gated vault entry';
  END IF;
  IF NEW.unlock_age IS DISTINCT FROM OLD.unlock_age
     AND coalesce(OLD.released, false) THEN
    RAISE EXCEPTION 'The unlock age of a released entry cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vault_age_release_guard ON public.vault_entries;
CREATE TRIGGER vault_age_release_guard
BEFORE UPDATE ON public.vault_entries
FOR EACH ROW EXECUTE FUNCTION public.vault_age_release_guard();