-- ============================================================
-- TIS PORTAL — CUSTOM SESSION LOGOUT HARDENING
-- Explicitly revokes custom-session tokens server-side on logout.
-- Manual Supabase execution required.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.logout_custom_session(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_hash text;
  v_updated integer;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_token'
    );
  END IF;

  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  UPDATE public.custom_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE token_hash = v_token_hash
    AND revoked_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Logout is intentionally idempotent. A token that was already revoked,
  -- expired, or absent is still safe to treat as logged out.
  RETURN jsonb_build_object(
    'success', true,
    'revoked', v_updated > 0
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.logout_custom_session(text)
FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.logout_custom_session(text)
TO anon, service_role;

COMMIT;
