-- PHASE 5B — REPORT CARD DATA ENHANCEMENTS
-- Purpose: Add class_teacher_name to grade RPCs for report card generation
--
-- This migration modifies:
-- 1. public.get_student_grades(TEXT, TEXT, TEXT) - Student custom-session RPC
-- 2. public.get_parent_child_grades(UUID, TEXT, TEXT) - Parent Supabase Auth RPC
--
-- IMPORTANT:
-- - Does NOT recreate the legacy Parent 4-arg RPC (deleted in A8.7B)
-- - Preserves all existing authorization mechanisms
-- - Preserves SECURITY DEFINER and search_path hardening
-- - Preserves existing grants
-- - p_term=NULL continues to return all terms for cumulative calculation
-- - p_session continues to isolate academic sessions

BEGIN;

-- ============================================================
-- 1. RECREATE STUDENT GRADE RPC (Custom Session Auth)
-- ============================================================
-- DROP first because RETURNS TABLE shape is changing (adding class_teacher_name)
-- PostgreSQL does not allow CREATE OR REPLACE when return type changes

DROP FUNCTION IF EXISTS public.get_student_grades(TEXT, TEXT, TEXT);

CREATE FUNCTION public.get_student_grades(
  p_session_token TEXT,
  p_term TEXT DEFAULT NULL,
  p_session TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  class_subject_id UUID,
  term TEXT,
  session TEXT,
  test_1 NUMERIC,
  test_2 NUMERIC,
  project_1 NUMERIC,
  assignment_1 NUMERIC,
  exam NUMERIC,
  total NUMERIC,
  grade_letter TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- joined class_subjects data
  class_subject_subject_id UUID,
  class_subject_class_id UUID,
  -- joined subjects data
  subject_name TEXT,
  subject_code TEXT,
  -- joined classes data (from class_subjects)
  class_subject_class_name TEXT,
  class_subject_class_tier TEXT,
  -- NEW: class teacher name
  class_teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_student_id UUID;
BEGIN
  -- Reject NULL/empty token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate Student session and derive student_id
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(
    p_session_token,
    'student'
  )
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_student_id := v_session.user_id;

  -- Return grades ONLY for the validated student
  RETURN QUERY
  SELECT
    g.id,
    g.student_id,
    g.class_subject_id,
    g.term,
    g.session,
    g.test_1,
    g.test_2,
    g.project_1,
    g.assignment_1,
    g.exam,
    g.total,
    g.grade_letter,
    g.remark,
    g.created_at,
    g.updated_at,
    -- class_subjects data
    cs.subject_id AS class_subject_subject_id,
    cs.class_id AS class_subject_class_id,
    -- subjects data
    sub.name AS subject_name,
    sub.code AS subject_code,
    -- class_subjects' class
    csc.name AS class_subject_class_name,
    csc.tier AS class_subject_class_tier,
    -- NEW: class teacher name
    ct.full_name AS class_teacher_name
  FROM public.grades g
  JOIN public.class_subjects cs ON cs.id = g.class_subject_id
  JOIN public.subjects sub ON sub.id = cs.subject_id
  LEFT JOIN public.classes csc ON csc.id = cs.class_id
  LEFT JOIN public.teachers ct ON ct.id = csc.class_teacher_id
  WHERE g.student_id = v_student_id
    AND (p_term IS NULL OR g.term = p_term)
    AND (p_session IS NULL OR g.session = p_session);
END;
$$;

-- ============================================================
-- 2. RESTORE STUDENT RPC PERMISSIONS
-- ============================================================
-- Student custom-session RPC: anon (for session validation) and service_role only
-- PUBLIC and authenticated must NOT have execute access

REVOKE EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 3. RECREATE PARENT GRADE RPC (Supabase Auth - 3 arguments)
-- ============================================================
-- DROP first because RETURNS TABLE shape is changing (adding class_teacher_name)
-- PostgreSQL does not allow CREATE OR REPLACE when return type changes
-- IMPORTANT: Only the UUID,TEXT,TEXT overload is recreated
-- The legacy TEXT,UUID,TEXT,TEXT overload was deleted in A8.7B and MUST NOT be recreated

DROP FUNCTION IF EXISTS public.get_parent_child_grades(UUID, TEXT, TEXT);

CREATE FUNCTION public.get_parent_child_grades(
  p_student_id UUID,
  p_term TEXT DEFAULT NULL,
  p_session TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  class_subject_id UUID,
  term TEXT,
  session TEXT,
  test_1 NUMERIC,
  test_2 NUMERIC,
  project_1 NUMERIC,
  assignment_1 NUMERIC,
  exam NUMERIC,
  total NUMERIC,
  grade_letter TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  class_subject_subject_id UUID,
  class_subject_class_id UUID,
  subject_name TEXT,
  subject_code TEXT,
  class_subject_class_name TEXT,
  class_subject_class_tier TEXT,
  -- NEW: class teacher name
  class_teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized parent';
  END IF;

  -- Verify parent_students relationship before returning any grade information
  -- This prevents cross-child access and hides whether other students exist
  IF NOT EXISTS (
    SELECT 1
    FROM public.parent_students ps
    WHERE ps.parent_id = v_parent_id
      AND ps.student_id = p_student_id
  ) THEN
    -- No relationship - return zero rows (unauthorized)
    RETURN;
  END IF;

  -- Return grades ONLY for the authorized child
  RETURN QUERY
  SELECT
    g.id,
    g.student_id,
    g.class_subject_id,
    g.term,
    g.session,
    g.test_1,
    g.test_2,
    g.project_1,
    g.assignment_1,
    g.exam,
    g.total,
    g.grade_letter,
    g.remark,
    g.created_at,
    g.updated_at,
    -- class_subjects data
    cs.subject_id AS class_subject_subject_id,
    cs.class_id AS class_subject_class_id,
    -- subjects data
    sub.name AS subject_name,
    sub.code AS subject_code,
    -- class_subjects' class
    csc.name AS class_subject_class_name,
    csc.tier AS class_subject_class_tier,
    -- NEW: class teacher name
    ct.full_name AS class_teacher_name
  FROM public.grades g
  JOIN public.class_subjects cs ON cs.id = g.class_subject_id
  JOIN public.subjects sub ON sub.id = cs.subject_id
  LEFT JOIN public.classes csc ON csc.id = cs.class_id
  LEFT JOIN public.teachers ct ON ct.id = csc.class_teacher_id
  WHERE g.student_id = p_student_id
    AND (p_term IS NULL OR g.term = p_term)
    AND (p_session IS NULL OR g.session = p_session);
END;
$$;

-- ============================================================
-- 4. RESTORE PARENT RPC PERMISSIONS
-- ============================================================
-- Parent Supabase Auth RPC: authenticated and service_role only
-- PUBLIC and anon must NOT have execute access

REVOKE ALL ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) TO service_role;

COMMIT;
