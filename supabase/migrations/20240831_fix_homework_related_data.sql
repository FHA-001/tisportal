BEGIN;

DROP FUNCTION IF EXISTS public.get_teacher_homework(TEXT);
DROP FUNCTION IF EXISTS public.get_student_homework(TEXT);

CREATE FUNCTION public.get_teacher_homework(p_session_token TEXT)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, class_id UUID, subject_id UUID,
  teacher_id UUID, published_at TIMESTAMPTZ, due_date DATE,
  attachment_url TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  class_name TEXT, class_tier TEXT, subject_name TEXT, teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
BEGIN
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  RETURN QUERY
  SELECT
    h.id, h.title, h.description, h.class_id, h.subject_id, h.teacher_id,
    h.published_at, h.due_date, h.attachment_url, h.created_at, h.updated_at,
    c.name::TEXT, c.tier::TEXT, s.name::TEXT, t.full_name::TEXT
  FROM public.homework h
  LEFT JOIN public.classes c ON c.id = h.class_id
  LEFT JOIN public.subjects s ON s.id = h.subject_id
  LEFT JOIN public.teachers t ON t.id = h.teacher_id
  WHERE h.teacher_id = v_teacher_id
  ORDER BY h.created_at DESC, h.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) TO service_role;

CREATE FUNCTION public.get_student_homework(p_session_token TEXT)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, class_id UUID, subject_id UUID,
  teacher_id UUID, published_at TIMESTAMPTZ, due_date DATE,
  attachment_url TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  class_name TEXT, class_tier TEXT, subject_name TEXT, teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_student_id UUID;
  v_class_id UUID;
BEGIN
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'student')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid student session';
  END IF;

  v_student_id := v_session.user_id;

  SELECT st.class_id INTO v_class_id
  FROM public.students st
  WHERE st.id = v_student_id
  LIMIT 1;

  IF NOT FOUND OR v_class_id IS NULL THEN
    RAISE EXCEPTION 'Student class not found';
  END IF;

  RETURN QUERY
  SELECT
    h.id, h.title, h.description, h.class_id, h.subject_id, h.teacher_id,
    h.published_at, h.due_date, h.attachment_url, h.created_at, h.updated_at,
    c.name::TEXT, c.tier::TEXT, s.name::TEXT, t.full_name::TEXT
  FROM public.homework h
  LEFT JOIN public.classes c ON c.id = h.class_id
  LEFT JOIN public.subjects s ON s.id = h.subject_id
  LEFT JOIN public.teachers t ON t.id = h.teacher_id
  WHERE h.class_id = v_class_id
  ORDER BY h.due_date ASC, h.created_at DESC, h.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_homework(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_homework(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_homework(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_homework(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.get_teacher_homework_assignments(p_session_token TEXT)
RETURNS TABLE (
  class_id UUID, class_name TEXT, class_tier TEXT,
  subject_id UUID, subject_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
BEGIN
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  RETURN QUERY
  SELECT DISTINCT
    cs.class_id, c.name::TEXT, c.tier::TEXT,
    cs.subject_id, s.name::TEXT
  FROM public.class_subjects cs
  JOIN public.classes c ON c.id = cs.class_id
  JOIN public.subjects s ON s.id = cs.subject_id
  WHERE cs.teacher_id = v_teacher_id
  ORDER BY c.name, s.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_teacher_homework_assignments(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_teacher_homework_assignments(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework_assignments(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework_assignments(TEXT) TO service_role;

COMMIT;
