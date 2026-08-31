-- Secure change_password with custom session token
-- This migration adds a secure TEXT overload of change_password that validates
-- the session token server-side instead of trusting browser-supplied user_id

BEGIN;

-- ============================================================
-- 1. Create secure TEXT overload for change_password
-- ============================================================

-- New secure overload that uses session token for authentication
CREATE OR REPLACE FUNCTION public.change_password(
  p_session_token TEXT,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_user_id UUID;
  v_role TEXT;
  v_current_password_hash TEXT;
  v_new_password_hash TEXT;
BEGIN
  -- Reject missing or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  -- Validate custom session server-side
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, NULL)
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  -- Derive identity ONLY from validated session
  v_user_id := v_session.user_id;
  v_role := v_session.role;

  -- Retrieve current password hash for the validated session owner
  IF v_role = 'teacher' OR v_role = 'accountant' THEN
    SELECT password_hash
    INTO v_current_password_hash
    FROM public.teachers
    WHERE id = v_user_id;
  ELSIF v_role = 'student' THEN
    SELECT password_hash
    INTO v_current_password_hash
    FROM public.students
    WHERE id = v_user_id;
  ELSIF v_role = 'parent' THEN
    SELECT password_hash
    INTO v_current_password_hash
    FROM public.parents
    WHERE id = v_user_id;
  ELSE
    RETURN jsonb_build_object('error', 'invalid_role');
  END IF;

  IF v_current_password_hash IS NULL THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  -- Verify current password using existing application method
  IF encode(extensions.digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex') != v_current_password_hash THEN
    RETURN jsonb_build_object('error', 'invalid_password');
  END IF;

  -- Hash new password using existing application method
  v_new_password_hash := encode(extensions.digest(p_new_password || 'TIS_SALT_2024', 'sha256'), 'hex');

  -- Update password for the validated session owner
  IF v_role = 'teacher' OR v_role = 'accountant' THEN
    UPDATE public.teachers
    SET
      password_hash = v_new_password_hash,
      must_change_password = FALSE
    WHERE id = v_user_id;
  ELSIF v_role = 'student' THEN
    UPDATE public.students
    SET
      password_hash = v_new_password_hash,
      must_change_password = FALSE
    WHERE id = v_user_id;
  ELSIF v_role = 'parent' THEN
    UPDATE public.parents
    SET
      password_hash = v_new_password_hash,
      must_change_password = FALSE
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 2. Grant permissions to new TEXT overload
-- ============================================================

-- Custom-auth users call as anon, so grant to anon only
REVOKE EXECUTE ON FUNCTION public.change_password(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_password(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.change_password(TEXT, TEXT, TEXT) TO anon;

-- Preserve service_role administrative access
GRANT EXECUTE ON FUNCTION public.change_password(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 3. Revoke browser access from old insecure UUID overload
-- ============================================================

-- Old UUID overload should not be callable from browser
REVOKE EXECUTE ON FUNCTION public.change_password(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_password(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.change_password(UUID, TEXT, TEXT) FROM authenticated;

-- Preserve postgres/service_role administrative access
GRANT EXECUTE ON FUNCTION public.change_password(UUID, TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.change_password(UUID, TEXT, TEXT) TO service_role;

COMMIT;
