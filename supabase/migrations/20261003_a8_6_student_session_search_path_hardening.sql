-- ============================================================
-- A8.6E  ESTUDENT CUSTOM-SESSION SECURITY DEFINER HARDENING
-- ============================================================
-- PURPOSE:
--   Harden SECURITY DEFINER search_path for actively-used Student
--   custom-session authentication functions to the secure pattern
--   SET search_path = '' consistent with the rest of the codebase.
--
-- SCOPE:
--   - validate_custom_session: Core session validation for Student auth
--   - refresh_custom_session: Session token refresh for Student auth
--
-- EXCLUDED (belongs to A8.7 legacy cleanup):
--   - create_student_by_teacher: Obsolete, replaced by create_student_by_teacher_auth
--   - login_teacher: Supabase Auth migration completed
--   - login_parent: Supabase Auth migration completed
--
-- CONTEXT:
--   - Student authentication remains on custom-session (intentional)
--   - Both functions already use explicit schema qualification
--   - No parameter name changes
--   - No business logic changes
--   - Student bcrypt/lazy migration from A8.6D remains untouched
--
-- SECURITY OUTCOMES:
--   - Consistent SECURITY DEFINER search_path pattern across codebase
--   - No functional changes to Student authentication
--   - No breaking changes to frontend
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. HARDCORE validate_custom_session
-- ------------------------------------------------------------
-- Core session validation helper used by Student login and
-- all custom-session RPCs. All object references are already
-- explicitly qualified, so changing to search_path = '' is safe.

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
  UPDATE public.custom_sessions
  SET last_seen_at = NOW()
  WHERE token_hash = v_token_hash
    AND expires_at > NOW()
    AND revoked_at IS NULL
    AND (p_required_role IS NULL OR role = p_required_role);
END;
$$;

-- ------------------------------------------------------------
-- 2. HARDCORE refresh_custom_session
-- ------------------------------------------------------------
-- Session refresh RPC used by frontend to keep server-side expiry
-- synchronized with browser inactivity. All object references are
-- already explicitly qualified.

CREATE OR REPLACE FUNCTION public.refresh_custom_session(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token_hash TEXT;
  v_rows_updated INTEGER;
BEGIN
  -- Reject NULL or empty tokens
  IF p_token IS NULL OR p_token = '' THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  -- Hash the provided token using SHA-256
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Update only if session is currently valid and not revoked
  UPDATE public.custom_sessions
  SET
    last_seen_at = NOW(),
    expires_at = NOW() + INTERVAL '30 minutes'
  WHERE token_hash = v_token_hash
    AND expires_at > NOW()
    AND revoked_at IS NULL;

  -- Return success only if a row was actually updated
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false);
  END IF;
END;
$$;

COMMIT;
