-- Harden admin_reset_password and reject_student_signup RPCs
-- This migration adds server-side Admin authorization to prevent direct RPC abuse
-- and ensures server-owned default passwords for password resets

BEGIN;

-- ============================================================
-- 1. Harden admin_reset_password
-- ============================================================

-- Replace with hardened version that:
-- - Requires Admin authorization via auth.uid() + public.is_admin()
-- - Ignores browser-supplied p_default_password
-- - Selects default password server-side based on role
-- - Uses existing password hashing method (digest + TIS_SALT_2024)

CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_role TEXT,
  p_user_id UUID,
  p_default_password TEXT  -- Kept for compatibility, ignored server-side
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_default_password TEXT;
  v_password_hash TEXT;
BEGIN
  -- Require Admin authorization
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Server selects default password based on role (ignore browser value)
  CASE p_role
    WHEN 'teacher' THEN
      v_default_password := 'Teacher@12';
    WHEN 'student' THEN
      v_default_password := 'Student@12';
    WHEN 'parent' THEN
      v_default_password := 'Parent@12';
    ELSE
      RETURN jsonb_build_object('error', 'invalid_role');
  END CASE;

  -- Hash using existing application method
  v_password_hash := encode(extensions.digest(v_default_password || 'TIS_SALT_2024', 'sha256'), 'hex');

  -- Update target account based on role
  IF p_role = 'teacher' THEN
    UPDATE public.teachers
    SET
      password_hash = v_password_hash,
      must_change_password = TRUE
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'teacher_not_found');
    END IF;
  ELSIF p_role = 'student' THEN
    UPDATE public.students
    SET
      password_hash = v_password_hash,
      must_change_password = TRUE
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'student_not_found');
    END IF;
  ELSIF p_role = 'parent' THEN
    UPDATE public.parents
    SET
      password_hash = v_password_hash,
      must_change_password = TRUE
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'parent_not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Revoke from PUBLIC and anon, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_reset_password(TEXT, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(TEXT, UUID, TEXT) TO authenticated;

-- ============================================================
-- 2. Harden reject_student_signup
-- ============================================================

-- Replace with hardened version that:
-- - Requires Admin authorization via auth.uid() + public.is_admin()
-- - Ignores browser-supplied p_admin_id
-- - Derives Admin ID from auth.uid()
-- - Updates students.status to 'rejected' (not delete from view)

CREATE OR REPLACE FUNCTION public.reject_student_signup(
  p_student_id UUID,
  p_admin_id UUID  -- Kept for compatibility, ignored server-side
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_student RECORD;
BEGIN
  -- Require Admin authorization
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Derive Admin ID from auth.uid() (ignore browser value)
  v_admin_id := auth.uid();

  -- Select pending student
  SELECT *
  INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error',
      'student_not_found_or_not_pending'
    );
  END IF;

  -- Update student status to rejected
  UPDATE public.students
  SET
    status = 'rejected',
    approved_by = v_admin_id,
    approved_date = NOW()
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Student signup request rejected'
  );
END;
$$;

-- Revoke from PUBLIC and anon, grant to authenticated only
REVOKE EXECUTE ON FUNCTION public.reject_student_signup(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_student_signup(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_student_signup(UUID, UUID) TO authenticated;

COMMIT;
