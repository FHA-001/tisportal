-- ============================================================
-- TIS PORTAL — BATCH 4 REGRESSION FIX
-- Restore Teacher class/subject/class-list reads through secure RPCs
-- without reopening direct teachers-table access.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_teacher_class_subjects(
  p_session_token text
)
RETURNS TABLE (
  id uuid,
  class_id uuid,
  subject_id uuid,
  teacher_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  class_name text,
  class_tier text,
  class_level text,
  subject_name text,
  subject_code text,
  teacher_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session record;
  v_teacher_id uuid;
BEGIN
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  RETURN QUERY
  SELECT
    cs.id,
    cs.class_id,
    cs.subject_id,
    cs.teacher_id,
    cs.created_at,
    cs.updated_at,
    c.name,
    c.tier,
    c.level,
    s.name,
    s.code,
    t.full_name
  FROM public.class_subjects cs
  JOIN public.classes c ON c.id = cs.class_id
  JOIN public.subjects s ON s.id = cs.subject_id
  JOIN public.teachers t ON t.id = cs.teacher_id
  WHERE cs.teacher_id = v_teacher_id
  ORDER BY c.name, s.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_teacher_class_subjects(text)
FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_subjects(text)
TO anon, service_role;

CREATE OR REPLACE FUNCTION public.get_teacher_classes(
  p_session_token text
)
RETURNS TABLE (
  id uuid,
  teacher_id uuid,
  class_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  class_name text,
  class_tier text,
  class_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session record;
  v_teacher_id uuid;
BEGIN
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'teacher')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid teacher session';
  END IF;

  v_teacher_id := v_session.user_id;

  RETURN QUERY
  SELECT
    ct.id,
    ct.teacher_id,
    ct.class_id,
    ct.created_at,
    ct.updated_at,
    c.name,
    c.tier,
    c.level
  FROM public.class_teachers ct
  JOIN public.classes c ON c.id = ct.class_id
  WHERE ct.teacher_id = v_teacher_id
  ORDER BY c.name;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_teacher_classes(text)
FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_classes(text)
TO anon, service_role;

COMMIT;
