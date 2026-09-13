-- ============================================================
-- HOMEWORK SECURITY — SECURE RPC ACCESS + TABLE LOCKDOWN
-- ============================================================
-- Purpose:
--   - Move Teacher Homework CRUD behind custom-session SECURITY DEFINER RPCs
--   - Move Student Homework read behind a custom-session SECURITY DEFINER RPC
--   - Remove unsafe direct client access to public.homework
--   - Disable client execution of unsafe get_student_class(uuid)
--   - Preserve service_role/postgres access
--
-- IMPORTANT:
--   Application frontend must be updated to use these RPCs after this
--   migration is applied.

BEGIN;

-- ============================================================
-- 1. SECURE TEACHER HOMEWORK READ
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_teacher_homework(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  class_id UUID,
  subject_id UUID,
  teacher_id UUID,
  published_at TIMESTAMPTZ,
  due_date DATE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  RETURN QUERY
  SELECT
    h.id,
    h.title,
    h.description,
    h.class_id,
    h.subject_id,
    h.teacher_id,
    h.published_at,
    h.due_date,
    h.attachment_url,
    h.created_at,
    h.updated_at
  FROM public.homework AS h
  WHERE h.teacher_id = v_teacher_id
  ORDER BY h.created_at DESC, h.id;
END;
$$;

-- ============================================================
-- 2. SECURE TEACHER HOMEWORK CREATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_teacher_homework(
  p_session_token TEXT,
  p_homework JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
  v_class_id UUID;
  v_subject_id UUID;
  v_title TEXT;
  v_description TEXT;
  v_due_date DATE;
  v_attachment_url TEXT;
  v_homework_id UUID;
BEGIN
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  IF p_homework IS NULL OR jsonb_typeof(p_homework) <> 'object' THEN
    RAISE EXCEPTION 'Homework payload must be an object';
  END IF;

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;
  v_class_id := NULLIF(p_homework->>'class_id', '')::UUID;
  v_subject_id := NULLIF(p_homework->>'subject_id', '')::UUID;
  v_title := NULLIF(BTRIM(p_homework->>'title'), '');
  v_description := NULLIF(BTRIM(p_homework->>'description'), '');
  v_due_date := NULLIF(p_homework->>'due_date', '')::DATE;
  v_attachment_url := NULLIF(BTRIM(p_homework->>'attachment_url'), '');

  IF v_class_id IS NULL
     OR v_subject_id IS NULL
     OR v_title IS NULL
     OR v_description IS NULL
     OR v_due_date IS NULL THEN
    RAISE EXCEPTION 'Missing required homework fields';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
      AND cs.subject_id = v_subject_id
  ) THEN
    RAISE EXCEPTION 'Teacher is not assigned to this class and subject';
  END IF;

  INSERT INTO public.homework (
    title,
    description,
    class_id,
    subject_id,
    teacher_id,
    due_date,
    attachment_url
  )
  VALUES (
    v_title,
    v_description,
    v_class_id,
    v_subject_id,
    v_teacher_id,
    v_due_date,
    v_attachment_url
  )
  RETURNING homework.id INTO v_homework_id;

  RETURN v_homework_id;
END;
$$;

-- ============================================================
-- 3. SECURE TEACHER HOMEWORK UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_teacher_homework(
  p_session_token TEXT,
  p_homework_id UUID,
  p_homework JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
  v_class_id UUID;
  v_subject_id UUID;
  v_title TEXT;
  v_description TEXT;
  v_due_date DATE;
  v_attachment_url TEXT;
BEGIN
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  IF p_homework_id IS NULL THEN
    RAISE EXCEPTION 'Homework ID is required';
  END IF;

  IF p_homework IS NULL OR jsonb_typeof(p_homework) <> 'object' THEN
    RAISE EXCEPTION 'Homework payload must be an object';
  END IF;

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.homework AS h
    WHERE h.id = p_homework_id
      AND h.teacher_id = v_teacher_id
  ) THEN
    RAISE EXCEPTION 'Homework not found or unauthorized';
  END IF;

  v_class_id := NULLIF(p_homework->>'class_id', '')::UUID;
  v_subject_id := NULLIF(p_homework->>'subject_id', '')::UUID;
  v_title := NULLIF(BTRIM(p_homework->>'title'), '');
  v_description := NULLIF(BTRIM(p_homework->>'description'), '');
  v_due_date := NULLIF(p_homework->>'due_date', '')::DATE;
  v_attachment_url := NULLIF(BTRIM(p_homework->>'attachment_url'), '');

  IF v_class_id IS NULL
     OR v_subject_id IS NULL
     OR v_title IS NULL
     OR v_description IS NULL
     OR v_due_date IS NULL THEN
    RAISE EXCEPTION 'Missing required homework fields';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
      AND cs.subject_id = v_subject_id
  ) THEN
    RAISE EXCEPTION 'Teacher is not assigned to this class and subject';
  END IF;

  UPDATE public.homework AS h
  SET
    title = v_title,
    description = v_description,
    class_id = v_class_id,
    subject_id = v_subject_id,
    due_date = v_due_date,
    attachment_url = v_attachment_url,
    updated_at = now()
  WHERE h.id = p_homework_id
    AND h.teacher_id = v_teacher_id;

  RETURN FOUND;
END;
$$;

-- ============================================================
-- 4. SECURE TEACHER HOMEWORK DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_teacher_homework(
  p_session_token TEXT,
  p_homework_id UUID
)
RETURNS BOOLEAN
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

  IF p_homework_id IS NULL THEN
    RAISE EXCEPTION 'Homework ID is required';
  END IF;

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  DELETE FROM public.homework AS h
  WHERE h.id = p_homework_id
    AND h.teacher_id = v_teacher_id;

  RETURN FOUND;
END;
$$;

-- ============================================================
-- 5. SECURE STUDENT HOMEWORK READ
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_student_homework(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  class_id UUID,
  subject_id UUID,
  teacher_id UUID,
  published_at TIMESTAMPTZ,
  due_date DATE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'student')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid student session';
  END IF;

  v_student_id := v_session.user_id;

  SELECT s.class_id
  INTO v_class_id
  FROM public.students AS s
  WHERE s.id = v_student_id
  LIMIT 1;

  IF NOT FOUND OR v_class_id IS NULL THEN
    RAISE EXCEPTION 'Student class not found';
  END IF;

  RETURN QUERY
  SELECT
    h.id,
    h.title,
    h.description,
    h.class_id,
    h.subject_id,
    h.teacher_id,
    h.published_at,
    h.due_date,
    h.attachment_url,
    h.created_at,
    h.updated_at
  FROM public.homework AS h
  WHERE h.class_id = v_class_id
  ORDER BY h.due_date ASC, h.created_at DESC, h.id;
END;
$$;

-- ============================================================
-- 6. RPC EXECUTE PERMISSIONS
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework(TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_teacher_homework(TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_teacher_homework(TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_homework(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.create_teacher_homework(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_teacher_homework(TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_teacher_homework(TEXT, UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_teacher_homework(TEXT, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.update_teacher_homework(TEXT, UUID, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_teacher_homework(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_teacher_homework(TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_teacher_homework(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_teacher_homework(TEXT, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_student_homework(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_homework(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_homework(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_homework(TEXT) TO service_role;

-- ============================================================
-- 7. DISABLE CLIENT ACCESS TO UNSAFE get_student_class(uuid)
-- ============================================================
-- Leave the function itself in place for compatibility/history, but remove
-- all browser/client execution paths. service_role remains available.

REVOKE EXECUTE ON FUNCTION public.get_student_class(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_student_class(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_student_class(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_class(UUID) TO service_role;

-- ============================================================
-- 8. REMOVE ALL LEGACY HOMEWORK POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete homework" ON public.homework;
DROP POLICY IF EXISTS "Admins can insert homework" ON public.homework;
DROP POLICY IF EXISTS "Admins can update homework" ON public.homework;
DROP POLICY IF EXISTS "Admins can view all homework" ON public.homework;
DROP POLICY IF EXISTS "Students can view their class homework" ON public.homework;
DROP POLICY IF EXISTS "Teachers can delete their homework" ON public.homework;
DROP POLICY IF EXISTS "Teachers can insert their homework" ON public.homework;
DROP POLICY IF EXISTS "Teachers can update their homework" ON public.homework;
DROP POLICY IF EXISTS "Teachers can view their homework" ON public.homework;

-- ============================================================
-- 9. LOCK DOWN DIRECT HOMEWORK TABLE ACCESS
-- ============================================================

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.homework FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.homework FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.homework FROM authenticated;

REVOKE ALL PRIVILEGES (
  id,
  title,
  description,
  class_id,
  subject_id,
  teacher_id,
  published_at,
  due_date,
  attachment_url,
  created_at,
  updated_at
) ON TABLE public.homework FROM PUBLIC;

REVOKE ALL PRIVILEGES (
  id,
  title,
  description,
  class_id,
  subject_id,
  teacher_id,
  published_at,
  due_date,
  attachment_url,
  created_at,
  updated_at
) ON TABLE public.homework FROM anon;

REVOKE ALL PRIVILEGES (
  id,
  title,
  description,
  class_id,
  subject_id,
  teacher_id,
  published_at,
  due_date,
  attachment_url,
  created_at,
  updated_at
) ON TABLE public.homework FROM authenticated;

-- No client-facing RLS policies are recreated.
-- Teacher and Student access is RPC-only.
-- service_role/postgres privileges are intentionally untouched.

COMMIT;
