CREATE OR REPLACE FUNCTION public.family_storage_limit_bytes(_family_id uuid, _env text DEFAULT 'live')
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_family_member(_family_id) THEN
    (5::bigint * 1024 * 1024 * 1024)
    + COALESCE((
        SELECT COUNT(*) * (30::bigint * 1024 * 1024 * 1024)
        FROM public.subscriptions s
        JOIN public.family_members fm ON fm.user_id = s.user_id
        WHERE fm.family_id = _family_id
          AND s.environment = _env
          AND s.price_id = 'extra_storage_30gb_monthly'
          AND (
            (s.status IN ('active','trialing','past_due')
              AND (s.current_period_end IS NULL OR s.current_period_end > now()))
            OR (s.status IN ('canceled','unpaid')
              AND s.current_period_end IS NOT NULL AND s.current_period_end > now())
          )
      ), 0)
  ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.family_storage_usage_bytes(_family_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.is_family_member(_family_id) THEN
    COALESCE((
      SELECT SUM(COALESCE((o.metadata->>'size')::bigint, 0))
      FROM storage.objects o
      WHERE o.bucket_id = 'memories'
        AND o.name LIKE _family_id::text || '/%'
    ), 0)
  ELSE NULL END;
$$;

REVOKE ALL ON FUNCTION public.family_storage_limit_bytes(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.family_storage_usage_bytes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.family_storage_limit_bytes(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.family_storage_usage_bytes(uuid) TO authenticated, service_role;