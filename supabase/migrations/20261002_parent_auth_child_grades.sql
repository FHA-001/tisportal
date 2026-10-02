-- A8.4B: Parent Child Grades migration to Supabase Auth
-- Requires public.current_parent_id() from the auth identity helpers migration.
-- Legacy custom-session overload is retained for later A8.7 cleanup.
-- This adds a three-argument overload that uses Supabase Auth via current_parent_id().

BEGIN;

-- Create the new Supabase Auth overload (three arguments)
-- PostgreSQL allows function overloading by parameter types/count
-- This adds a new overload alongside existing get_parent_child_grades(TEXT, UUID, TEXT, TEXT)
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
  class_subject_class_tier TEXT
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

-- Set permissions for the new three-argument overload
-- PostgreSQL sets permissions per function signature (overload)
REVOKE ALL ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) FROM anon;

GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(UUID, TEXT, TEXT) TO service_role;

COMMIT;
