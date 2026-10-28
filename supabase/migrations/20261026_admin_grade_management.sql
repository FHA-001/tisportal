-- Admin Grade Management RPCs
-- This migration creates secure RPCs for Admin grade operations
-- to allow admins to view and edit grades for any class/subject
-- while maintaining data integrity and preventing duplicates

BEGIN;

-- ============================================================
-- 1. ADMIN GRADE FETCH RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_grades(
  p_class_subject_id UUID,
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
  student_full_name TEXT,
  student_admission_number TEXT,
  student_tier TEXT,
  student_class_id UUID,
  class_subject_subject_id UUID,
  class_subject_class_id UUID,
  subject_name TEXT,
  subject_code TEXT,
  class_subject_class_name TEXT,
  class_subject_class_tier TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_class_id UUID;
BEGIN
  -- Verify caller is authenticated admin
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  -- Get class_id from class_subject
  SELECT cs.class_id
  INTO v_class_id
  FROM public.class_subjects AS cs
  WHERE cs.id = p_class_subject_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return grades for the specified class_subject
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
    s.full_name::TEXT,
    s.admission_number::TEXT,
    s.tier::TEXT,
    s.class_id,
    cs.subject_id,
    cs.class_id,
    sub.name::TEXT,
    sub.code::TEXT,
    c.name::TEXT,
    c.tier::TEXT
  FROM public.grades AS g
  JOIN public.students AS s ON s.id = g.student_id
  JOIN public.class_subjects AS cs ON cs.id = g.class_subject_id
  JOIN public.subjects AS sub ON sub.id = cs.subject_id
  LEFT JOIN public.classes AS c ON c.id = cs.class_id
  WHERE g.class_subject_id = p_class_subject_id
    AND s.class_id = v_class_id
    AND (p_term IS NULL OR g.term = p_term)
    AND (p_session IS NULL OR g.session = p_session)
  ORDER BY s.full_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_grades(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_grades(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_grades(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_grades(UUID, TEXT, TEXT) TO service_role;

-- ============================================================
-- 2. ADMIN GRADE SAVE RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_admin_grades(
  p_grades JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_grade_item JSONB;
  v_grade_id UUID;
  v_student_id UUID;
  v_class_subject_id UUID;
  v_term TEXT;
  v_session_name TEXT;
  v_existing_class_subject_id UUID;
  v_existing_student_id UUID;
  v_class_id UUID;
  v_student_class_id UUID;
  v_idx INTEGER;
  v_grades_array JSONB[];
BEGIN
  -- Verify caller is authenticated admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: admin access required');
  END IF;

  IF p_grades IS NULL OR jsonb_typeof(p_grades) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Grades must be an array');
  END IF;

  IF jsonb_array_length(p_grades) = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No grades to save');
  END IF;

  v_grades_array := ARRAY(SELECT jsonb_array_elements(p_grades));

  -- ============================================================
  -- PHASE 1: VALIDATE ALL ITEMS BEFORE ANY WRITES
  -- ============================================================
  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    v_student_id := NULLIF(v_grade_item->>'student_id', '')::UUID;
    v_class_subject_id := NULLIF(v_grade_item->>'class_subject_id', '')::UUID;
    v_term := NULLIF(v_grade_item->>'term', '');
    v_session_name := NULLIF(v_grade_item->>'session', '');
    v_grade_id := NULLIF(v_grade_item->>'id', '')::UUID;

    IF v_student_id IS NULL OR v_class_subject_id IS NULL OR v_term IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Missing required fields: student_id, class_subject_id, or term'
      );
    END IF;

    -- Verify class_subject exists
    SELECT cs.class_id
    INTO v_class_id
    FROM public.class_subjects AS cs
    WHERE cs.id = v_class_subject_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Class subject not found'
      );
    END IF;

    -- Verify student exists and belongs to the class
    SELECT s.class_id
    INTO v_student_class_id
    FROM public.students AS s
    WHERE s.id = v_student_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Student not found');
    END IF;

    IF v_student_class_id IS DISTINCT FROM v_class_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Student does not belong to this class'
      );
    END IF;

    -- For existing grade ID, verify it exists and belongs to the same student/class_subject
    IF v_grade_id IS NOT NULL THEN
      SELECT g.class_subject_id, g.student_id
      INTO v_existing_class_subject_id, v_existing_student_id
      FROM public.grades AS g
      WHERE g.id = v_grade_id
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Grade ID not found');
      END IF;

      IF v_existing_student_id IS DISTINCT FROM v_student_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot change student_id on existing grade'
        );
      END IF;

      IF v_existing_class_subject_id IS DISTINCT FROM v_class_subject_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot change class_subject_id on existing grade'
        );
      END IF;
    END IF;
  END LOOP;

  -- ============================================================
  -- PHASE 2: ALL VALIDATIONS PASSED - PERFORM WRITES
  -- ============================================================
  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    v_student_id := NULLIF(v_grade_item->>'student_id', '')::UUID;
    v_class_subject_id := NULLIF(v_grade_item->>'class_subject_id', '')::UUID;
    v_term := NULLIF(v_grade_item->>'term', '');
    v_session_name := NULLIF(v_grade_item->>'session', '');
    v_grade_id := NULLIF(v_grade_item->>'id', '')::UUID;

    IF v_grade_id IS NOT NULL THEN
      -- Update existing grade
      UPDATE public.grades AS g
      SET
        test_1 = NULLIF(v_grade_item->>'test_1', '')::NUMERIC,
        test_2 = NULLIF(v_grade_item->>'test_2', '')::NUMERIC,
        project_1 = NULLIF(v_grade_item->>'project_1', '')::NUMERIC,
        assignment_1 = NULLIF(v_grade_item->>'assignment_1', '')::NUMERIC,
        exam = NULLIF(v_grade_item->>'exam', '')::NUMERIC,
        total = NULLIF(v_grade_item->>'total', '')::NUMERIC,
        grade_letter = NULLIF(v_grade_item->>'grade_letter', ''),
        remark = NULLIF(v_grade_item->>'remark', ''),
        term = v_term,
        session = v_session_name,
        updated_at = NOW()
      WHERE g.id = v_grade_id;
    ELSE
      -- Insert new grade with duplicate prevention via ON CONFLICT
      INSERT INTO public.grades (
        student_id, class_subject_id, term, session,
        test_1, test_2, project_1, assignment_1, exam,
        total, grade_letter, remark
      ) VALUES (
        v_student_id, v_class_subject_id, v_term, v_session_name,
        NULLIF(v_grade_item->>'test_1', '')::NUMERIC,
        NULLIF(v_grade_item->>'test_2', '')::NUMERIC,
        NULLIF(v_grade_item->>'project_1', '')::NUMERIC,
        NULLIF(v_grade_item->>'assignment_1', '')::NUMERIC,
        NULLIF(v_grade_item->>'exam', '')::NUMERIC,
        NULLIF(v_grade_item->>'total', '')::NUMERIC,
        NULLIF(v_grade_item->>'grade_letter', ''),
        NULLIF(v_grade_item->>'remark', '')
      )
      ON CONFLICT (student_id, class_subject_id, term, session)
      DO UPDATE SET
        test_1 = EXCLUDED.test_1,
        test_2 = EXCLUDED.test_2,
        project_1 = EXCLUDED.project_1,
        assignment_1 = EXCLUDED.assignment_1,
        exam = EXCLUDED.exam,
        total = EXCLUDED.total,
        grade_letter = EXCLUDED.grade_letter,
        remark = EXCLUDED.remark,
        updated_at = NOW();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'saved_count', jsonb_array_length(p_grades)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_admin_grades(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_admin_grades(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_admin_grades(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_grades(JSONB) TO service_role;

COMMIT;
