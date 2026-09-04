-- PHASE 2E — STAGE B6A-1 SECURE STUDENT + PARENT GRADE READS
-- This migration creates secure RPCs for Student and Parent grade reads
-- to eliminate their dependence on direct table access.

-- ============================================================
-- 1. SECURE STUDENT GRADE READ RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_student_grades(
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
  class_subject_class_tier TEXT
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
    csc.tier AS class_subject_class_tier
  FROM public.grades g
  JOIN public.class_subjects cs ON cs.id = g.class_subject_id
  JOIN public.subjects sub ON sub.id = cs.subject_id
  LEFT JOIN public.classes csc ON csc.id = cs.class_id
  WHERE g.student_id = v_student_id
    AND (p_term IS NULL OR g.term = p_term)
    AND (p_session IS NULL OR g.session = p_session);
END;
$$;

-- ============================================================
-- 2. STUDENT RPC PERMISSIONS
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_grades(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 3. SECURE PARENT CHILD GRADE READ RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_parent_child_grades(
  p_session_token TEXT,
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
  -- joined class_subjects data
  class_subject_subject_id UUID,
  class_subject_class_id UUID,
  -- joined subjects data
  subject_name TEXT,
  subject_code TEXT,
  -- joined classes data (from class_subjects)
  class_subject_class_name TEXT,
  class_subject_class_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_parent_id UUID;
BEGIN
  -- Reject NULL/empty token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate Parent session and derive parent_id
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(
    p_session_token,
    'parent'
  )
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_parent_id := v_session.user_id;

  -- Verify parent_students relationship
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
    csc.tier AS class_subject_class_tier
  FROM public.grades g
  JOIN public.class_subjects cs ON cs.id = g.class_subject_id
  JOIN public.subjects sub ON sub.id = cs.subject_id
  LEFT JOIN public.classes csc ON csc.id = cs.class_id
  WHERE g.student_id = p_student_id
    AND (p_term IS NULL OR g.term = p_term)
    AND (p_session IS NULL OR g.session = p_session);
END;
$$;

-- ============================================================
-- 4. PARENT RPC PERMISSIONS
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_parent_child_grades(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_child_grades(TEXT, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(TEXT, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(TEXT, UUID, TEXT, TEXT) TO service_role;
