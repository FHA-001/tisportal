BEGIN;

CREATE OR REPLACE FUNCTION public.get_teacher_grades(
  p_class_subject_id uuid,
  p_term text DEFAULT NULL,
  p_session text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  class_subject_id uuid,
  term text,
  session text,
  test_1 numeric,
  test_2 numeric,
  project_1 numeric,
  assignment_1 numeric,
  exam numeric,
  total numeric,
  grade_letter text,
  remark text,
  created_at timestamptz,
  updated_at timestamptz,
  student_full_name text,
  student_admission_number text,
  student_tier text,
  student_class_id uuid,
  class_subject_subject_id uuid,
  class_subject_class_id uuid,
  subject_name text,
  subject_code text,
  class_subject_class_name text,
  class_subject_class_tier text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_class_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN;
  END IF;

  SELECT cs.class_id
  INTO v_class_id
  FROM public.class_subjects AS cs
  WHERE cs.id = p_class_subject_id
    AND cs.teacher_id = v_teacher_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

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
    s.full_name::text,
    s.admission_number::text,
    s.tier::text,
    s.class_id,
    cs.subject_id,
    cs.class_id,
    sub.name::text,
    sub.code::text,
    c.name::text,
    c.tier::text
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

REVOKE ALL ON FUNCTION public.get_teacher_grades(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_grades(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_grades(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_grades(uuid, text, text) TO service_role;


CREATE OR REPLACE FUNCTION public.save_teacher_grades(
  p_grades jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_grade_item jsonb;
  v_grade_id uuid;
  v_student_id uuid;
  v_class_subject_id uuid;
  v_term text;
  v_session_name text;
  v_existing_class_subject_id uuid;
  v_existing_student_id uuid;
  v_class_id uuid;
  v_student_class_id uuid;
  v_idx integer;
  v_grades_array jsonb[];
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized teacher');
  END IF;

  IF p_grades IS NULL OR jsonb_typeof(p_grades) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Grades must be an array');
  END IF;

  IF jsonb_array_length(p_grades) = 0 THEN
    RETURN jsonb_build_object('success', true, 'message', 'No grades to save');
  END IF;

  v_grades_array := ARRAY(SELECT jsonb_array_elements(p_grades));

  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    v_student_id := NULLIF(v_grade_item->>'student_id', '')::uuid;
    v_class_subject_id := NULLIF(v_grade_item->>'class_subject_id', '')::uuid;
    v_term := NULLIF(v_grade_item->>'term', '');
    v_session_name := NULLIF(v_grade_item->>'session', '');
    v_grade_id := NULLIF(v_grade_item->>'id', '')::uuid;

    IF v_student_id IS NULL OR v_class_subject_id IS NULL OR v_term IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Missing required fields: student_id, class_subject_id, or term'
      );
    END IF;

    SELECT cs.class_id
    INTO v_class_id
    FROM public.class_subjects AS cs
    WHERE cs.id = v_class_subject_id
      AND cs.teacher_id = v_teacher_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unauthorized class_subject_id or not assigned to this teacher'
      );
    END IF;

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

    IF v_grade_id IS NOT NULL THEN
      SELECT g.class_subject_id, g.student_id
      INTO v_existing_class_subject_id, v_existing_student_id
      FROM public.grades AS g
      WHERE g.id = v_grade_id
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Grade ID not found');
      END IF;

      PERFORM 1
      FROM public.class_subjects AS cs
      WHERE cs.id = v_existing_class_subject_id
        AND cs.teacher_id = v_teacher_id;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot modify grade from another teacher''s assignment'
        );
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

  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    v_student_id := NULLIF(v_grade_item->>'student_id', '')::uuid;
    v_class_subject_id := NULLIF(v_grade_item->>'class_subject_id', '')::uuid;
    v_term := NULLIF(v_grade_item->>'term', '');
    v_session_name := NULLIF(v_grade_item->>'session', '');
    v_grade_id := NULLIF(v_grade_item->>'id', '')::uuid;

    IF v_grade_id IS NOT NULL THEN
      UPDATE public.grades AS g
      SET
        test_1 = NULLIF(v_grade_item->>'test_1', '')::numeric,
        test_2 = NULLIF(v_grade_item->>'test_2', '')::numeric,
        project_1 = NULLIF(v_grade_item->>'project_1', '')::numeric,
        assignment_1 = NULLIF(v_grade_item->>'assignment_1', '')::numeric,
        exam = NULLIF(v_grade_item->>'exam', '')::numeric,
        total = NULLIF(v_grade_item->>'total', '')::numeric,
        grade_letter = NULLIF(v_grade_item->>'grade_letter', ''),
        remark = NULLIF(v_grade_item->>'remark', ''),
        term = v_term,
        session = v_session_name,
        updated_at = now()
      WHERE g.id = v_grade_id;
    ELSE
      INSERT INTO public.grades (
        student_id, class_subject_id, term, session,
        test_1, test_2, project_1, assignment_1, exam,
        total, grade_letter, remark
      ) VALUES (
        v_student_id, v_class_subject_id, v_term, v_session_name,
        NULLIF(v_grade_item->>'test_1', '')::numeric,
        NULLIF(v_grade_item->>'test_2', '')::numeric,
        NULLIF(v_grade_item->>'project_1', '')::numeric,
        NULLIF(v_grade_item->>'assignment_1', '')::numeric,
        NULLIF(v_grade_item->>'exam', '')::numeric,
        NULLIF(v_grade_item->>'total', '')::numeric,
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
        updated_at = now();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'saved_count', jsonb_array_length(p_grades)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_teacher_grades(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_teacher_grades(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(jsonb) TO service_role;

COMMIT;
