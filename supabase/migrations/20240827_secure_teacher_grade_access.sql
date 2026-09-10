-- PHASE 2E — STAGE B6A-2 SECURE TEACHER GRADE READS + BULK SAVES
-- This migration creates secure RPCs for Teacher grade operations
-- to eliminate Teacher's direct table access to grades.

-- ============================================================
-- 1. SECURE TEACHER GRADE READ RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_teacher_grades(
  p_session_token TEXT,
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
  -- student data for grading UI
  student_full_name TEXT,
  student_admission_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
  v_class_id UUID;
BEGIN
  -- Reject NULL/empty token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate Teacher session and derive teacher_id
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(
    p_session_token,
    'teacher'
  )
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_teacher_id := v_session.user_id;

  -- Verify Teacher is assigned to this class_subject
  SELECT class_id
  INTO v_class_id
  FROM public.class_subjects
  WHERE id = p_class_subject_id
    AND teacher_id = v_teacher_id
  LIMIT 1;

  IF NOT FOUND THEN
    -- Teacher not authorized for this class_subject
    RETURN;
  END IF;

  -- Return grades ONLY for this Teacher's assignment
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
    -- student data for grading UI
    s.full_name AS student_full_name,
    s.admission_number AS student_admission_number
  FROM public.grades g
  JOIN public.students s ON s.id = g.student_id
  WHERE g.class_subject_id = p_class_subject_id
    AND s.class_id = v_class_id
    AND (p_term IS NULL OR g.term = p_term)
    AND (p_session IS NULL OR g.session = p_session);
END;
$$;

-- ============================================================
-- 2. TEACHER READ RPC PERMISSIONS
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_teacher_grades(TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_teacher_grades(TEXT, UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_grades(TEXT, UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_grades(TEXT, UUID, TEXT, TEXT) TO service_role;

-- ============================================================
-- 3. SECURE TEACHER BULK SAVE RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_teacher_grades(
  p_session_token TEXT,
  p_grades JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
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
  -- Reject NULL/empty token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid session token'
    );
  END IF;

  -- Validate Teacher session and derive teacher_id
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(
    p_session_token,
    'teacher'
  )
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid session'
    );
  END IF;

  v_teacher_id := v_session.user_id;

  -- Validate p_grades is an array
  IF p_grades IS NULL OR jsonb_typeof(p_grades) <> 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Grades must be an array'
    );
  END IF;

  -- If empty array, return success without writes
  IF jsonb_array_length(p_grades) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No grades to save'
    );
  END IF;

  -- Convert to array for iteration
  v_grades_array := ARRAY(
    SELECT jsonb_array_elements(p_grades)
  );

  -- ============================================================
  -- PHASE 1: VALIDATE ALL ITEMS BEFORE ANY WRITES
  -- ============================================================
  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    -- Extract required fields
    v_student_id := (v_grade_item->>'student_id')::UUID;
    v_class_subject_id := (v_grade_item->>'class_subject_id')::UUID;
    v_term := v_grade_item->>'term';
    v_session_name := v_grade_item->>'session';
    v_grade_id := (v_grade_item->>'id')::UUID;

    -- Validate required fields exist
    IF v_student_id IS NULL OR v_class_subject_id IS NULL OR v_term IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Missing required fields: student_id, class_subject_id, or term'
      );
    END IF;

    -- ============================================================
    -- VALIDATION: class_subject_id must exist and belong to Teacher
    -- ============================================================
    SELECT class_id
    INTO v_class_id
    FROM public.class_subjects
    WHERE id = v_class_subject_id
      AND teacher_id = v_teacher_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unauthorized class_subject_id or not assigned to this teacher'
      );
    END IF;

    -- ============================================================
    -- VALIDATION: student must exist and belong to the class
    -- ============================================================
    SELECT class_id
    INTO v_student_class_id
    FROM public.students
    WHERE id = v_student_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Student not found'
      );
    END IF;

    IF v_student_class_id IS DISTINCT FROM v_class_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Student does not belong to this class'
      );
    END IF;

    -- ============================================================
    -- VALIDATION: For existing row ID, verify ownership and immutability
    -- ============================================================
    IF v_grade_id IS NOT NULL THEN
      -- Check if existing row exists
      SELECT class_subject_id, student_id
      INTO v_existing_class_subject_id, v_existing_student_id
      FROM public.grades
      WHERE id = v_grade_id
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Grade ID not found'
        );
      END IF;

      -- Verify existing row belongs to Teacher's assignment
      SELECT class_id
      INTO v_class_id
      FROM public.class_subjects
      WHERE id = v_existing_class_subject_id
        AND teacher_id = v_teacher_id
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot modify grade from another teacher''s assignment'
        );
      END IF;

      -- Identity fields must NOT change
      IF v_existing_student_id != v_student_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot change student_id on existing grade'
        );
      END IF;

      IF v_existing_class_subject_id != v_class_subject_id THEN
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

    v_student_id := (v_grade_item->>'student_id')::UUID;
    v_class_subject_id := (v_grade_item->>'class_subject_id')::UUID;
    v_term := v_grade_item->>'term';
    v_session_name := v_grade_item->>'session';
    v_grade_id := (v_grade_item->>'id')::UUID;

    IF v_grade_id IS NOT NULL THEN
      UPDATE public.grades
      SET
        test_1 = (v_grade_item->>'test_1')::NUMERIC,
        test_2 = (v_grade_item->>'test_2')::NUMERIC,
        project_1 = (v_grade_item->>'project_1')::NUMERIC,
        assignment_1 = (v_grade_item->>'assignment_1')::NUMERIC,
        exam = (v_grade_item->>'exam')::NUMERIC,
        total = (v_grade_item->>'total')::NUMERIC,
        grade_letter = v_grade_item->>'grade_letter',
        remark = v_grade_item->>'remark',
        term = v_term,
        session = v_session_name,
        updated_at = now()
      WHERE id = v_grade_id;

    ELSE
      INSERT INTO public.grades (
        student_id,
        class_subject_id,
        term,
        session,
        test_1,
        test_2,
        project_1,
        assignment_1,
        exam,
        total,
        grade_letter,
        remark
      ) VALUES (
        v_student_id,
        v_class_subject_id,
        v_term,
        v_session_name,
        (v_grade_item->>'test_1')::NUMERIC,
        (v_grade_item->>'test_2')::NUMERIC,
        (v_grade_item->>'project_1')::NUMERIC,
        (v_grade_item->>'assignment_1')::NUMERIC,
        (v_grade_item->>'exam')::NUMERIC,
        (v_grade_item->>'total')::NUMERIC,
        v_grade_item->>'grade_letter',
        v_grade_item->>'remark'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'saved_count', jsonb_array_length(p_grades)
  );
END;
$$;

-- ============================================================
-- 4. TEACHER SAVE RPC PERMISSIONS
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) TO service_role;
