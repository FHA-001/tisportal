-- ============================================================
-- A8.6E CORRECTIVE  EFIX validate_custom_session AMBIGUITY
-- ============================================================
-- PURPOSE:
--   Fix PostgreSQL error 42702 "column reference role is ambiguous"
--   in validate_custom_session caused by A8.6E search_path hardening.
--
-- ROOT CAUSE:
--   After changing validate_custom_session to SET search_path = '',
--   the UPDATE statement's unqualified column reference "role" became
--   ambiguous between:
--   - The RETURNS TABLE output variable "role"
--   - The public.custom_sessions.role column
--
-- FIX:
--   Qualify all column references in the UPDATE statement with a table alias
--   to disambiguate from PL/pgSQL output parameters.
--
-- SCOPE:
--   - validate_custom_session only
--   - No signature changes
--   - No security hardening changes
--   - search_path = '' preserved
--   - Grants preserved
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- FIX validate_custom_session UPDATE AMBIGUITY
-- ------------------------------------------------------------
-- Use table alias "cs" for all column references in the UPDATE
-- to disambiguate from the RETURNS TABLE output variable "role".

CREATE OR REPLACE FUNCTION public.validate_custom_session(
  p_token TEXT,
  p_required_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_hash TEXT;
BEGIN
  -- Hash the provided token using SHA-256
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Return session data if valid
  RETURN QUERY
  SELECT
    cs.user_id,
    cs.role,
    (cs.expires_at > NOW() AND cs.revoked_at IS NULL)::BOOLEAN AS is_valid
  FROM public.custom_sessions cs
  WHERE cs.token_hash = v_token_hash
    AND cs.expires_at > NOW()
    AND cs.revoked_at IS NULL
    AND (p_required_role IS NULL OR cs.role = p_required_role);

  -- Update last_seen_at for activity tracking (only for valid sessions)
  -- FIX: Use table alias "cs" to disambiguate column references
  -- from the RETURNS TABLE output variable "role"
  UPDATE public.custom_sessions AS cs
  SET last_seen_at = NOW()
  WHERE cs.token_hash = v_token_hash
    AND cs.expires_at > NOW()
    AND cs.revoked_at IS NULL
    AND (p_required_role IS NULL OR cs.role = p_required_role);
END;
$$;

-- ------------------------------------------------------------
-- VERIFY GRANTS ARE PRESERVED
-- ------------------------------------------------------------
-- validate_custom_session should remain inaccessible to anon/authenticated
-- Only SECURITY DEFINER functions should use it internally
-- service_role should retain execute access
--
-- Expected state (from A8.6E deployment):
-- - PUBLIC: no execute
-- - anon: no execute
-- - authenticated: no execute
-- - service_role: execute
--
-- CREATE OR REPLACE FUNCTION preserves existing grants by default.
-- No explicit REVOKE/GRANT needed unless they were accidentally broadened.

COMMIT;
