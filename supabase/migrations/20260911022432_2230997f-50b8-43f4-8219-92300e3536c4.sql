CREATE OR REPLACE FUNCTION public.family_plan_status(_family_id uuid, _env text DEFAULT 'live')
RETURNS TABLE(is_paid boolean, next_payment_at timestamptz, cancel_at_period_end boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH subs AS (
    SELECT s.*
    FROM public.subscriptions s
    JOIN public.family_members fm ON fm.user_id = s.user_id
    WHERE fm.family_id = _family_id
      AND s.environment = _env
      AND public.is_family_member(_family_id)
      AND (
        (s.status IN ('active', 'trialing', 'past_due')
          AND (s.current_period_end IS NULL OR s.current_period_end > now()))
        OR (s.status IN ('canceled', 'unpaid') AND s.current_period_end > now())
      )
  )
  SELECT
    EXISTS (SELECT 1 FROM subs),
    (SELECT min(current_period_end) FROM subs WHERE current_period_end > now()),
    COALESCE((SELECT bool_or(coalesce(cancel_at_period_end, false)) FROM subs), false);
$$;

REVOKE ALL ON FUNCTION public.family_plan_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_plan_status(uuid, text) TO authenticated, service_role;