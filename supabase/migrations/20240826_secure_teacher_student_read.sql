-- Secure Teacher Student Read RPC
-- This migration creates a secure RPC for teachers to read students in their assigned classes
-- using session-token authentication and class_subjects authorization

BEGIN;

-- ============================================================
-- 1. CREATE SECURE TEACHER STUDENT READ RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_students_by_teacher(
  p_class_id UUID,
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  email TEXT,
  phone_number TEXT,
  gender TEXT,
  admission_number TEXT,
  class_id UUID,
  tier TEXT,
  status TEXT,
  date_of_birth DATE,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  classes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id UUID;
  v_is_valid BOOLEAN;
BEGIN
  -- Reject NULL/empty token by returning no rows
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate teacher session
  SELECT is_valid, user_id INTO v_is_valid, v_teacher_id
  FROM public.validate_custom_session(p_session_token, 'teacher');

  -- Require valid session
  IF NOT v_is_valid OR v_teacher_id IS NULL THEN
    RETURN;
  END IF;

  -- Authorize requested class: teacher must have class_subjects assignment
  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = p_class_id
  ) THEN
    -- Unauthorized class: return no rows (do not leak existence)
    RETURN;
  END IF;

  -- Return safe directory shape only (exclude password_hash, reset_token, etc.)
  RETURN QUERY
  SELECT
    s.id,
    s.full_name,
    s.username,
    s.email,
    s.phone_number,
    s.gender,
    s.admission_number,
    s.class_id,
    s.tier,
    s.status,
    s.date_of_birth,
    s.parent_name,
    s.parent_phone,
    s.parent_email,
    s.created_at,
    s.updated_at,
    jsonb_build_object(
      'name', c.name,
      'tier', c.tier
    ) as classes
  FROM public.students s
  LEFT JOIN public.classes c ON s.class_id = c.id
  WHERE s.class_id = p_class_id
  ORDER BY s.full_name ASC;
END;
$$;

-- ============================================================
-- 2. SET PERMISSIONS
-- ============================================================

-- Revoke broad access
REVOKE EXECUTE ON FUNCTION public.get_students_by_teacher(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_students_by_teacher(UUID, TEXT) FROM authenticated;

-- Grant to anon (for custom-auth teachers using anon key)
GRANT EXECUTE ON FUNCTION public.get_students_by_teacher(UUID, TEXT) TO anon;

-- Preserve postgres/service_role administrative access

-- ============================================================
-- 3. DO NOT TOUCH students_directory
-- ============================================================

-- students_directory view and its permissions remain unchanged
-- This allows staged rollout without breaking existing Teacher frontend

COMMIT;
