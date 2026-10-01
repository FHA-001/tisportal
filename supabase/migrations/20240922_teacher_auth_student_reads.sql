-- A8.2A — Teacher student reads via Supabase Auth
-- Adds an Auth-native overload of get_students_by_teacher.
--
-- IMPORTANT:
--   - Keeps the existing (p_class_id UUID, p_session_token TEXT) overload.
--   - Student custom auth is untouched.
--   - Frontend migration happens after this is applied and verified.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_students_by_teacher(
  p_class_id uuid
)
RETURNS TABLE(
  id uuid,
  full_name text,
  username text,
  email text,
  phone_number text,
  gender text,
  admission_number text,
  class_id uuid,
  tier text,
  status text,
  date_of_birth date,
  parent_name text,
  parent_phone text,
  parent_email text,
  created_at timestamptz,
  updated_at timestamptz,
  classes jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = p_class_id
  ) THEN
    RETURN;
  END IF;

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
    ) AS classes
  FROM public.students AS s
  LEFT JOIN public.classes AS c
    ON c.id = s.class_id
  WHERE s.class_id = p_class_id
    AND s.status = 'approved'
    AND s.enrollment_status = 'active'
    AND COALESCE(s.is_active, false) = true
  ORDER BY s.full_name ASC;
END;
$$;

REVOKE ALL
ON FUNCTION public.get_students_by_teacher(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_students_by_teacher(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_students_by_teacher(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_students_by_teacher(uuid)
TO service_role;

COMMIT;
