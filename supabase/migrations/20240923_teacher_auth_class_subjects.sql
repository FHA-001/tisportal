-- A8.2B — Teacher class/subject assignments via Supabase Auth
-- Adds an Auth-native Teacher-only assignment RPC.
--
-- Does NOT modify Admin class_subject management.
-- Does NOT modify Student authentication.
-- Does NOT remove any compatibility-session RPC yet.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_teacher_class_subjects()
RETURNS TABLE (
  id uuid,
  class_id uuid,
  subject_id uuid,
  teacher_id uuid,
  class_name text,
  class_tier text,
  class_level text,
  subject_name text,
  subject_code text
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

  RETURN QUERY
  SELECT
    cs.id,
    cs.class_id,
    cs.subject_id,
    cs.teacher_id,
    c.name AS class_name,
    c.tier AS class_tier,
    c.level AS class_level,
    s.name AS subject_name,
    s.code AS subject_code
  FROM public.class_subjects AS cs
  JOIN public.classes AS c
    ON c.id = cs.class_id
  JOIN public.subjects AS s
    ON s.id = cs.subject_id
  WHERE cs.teacher_id = v_teacher_id
  ORDER BY c.name ASC, s.name ASC;
END;
$$;

REVOKE ALL
ON FUNCTION public.get_teacher_class_subjects()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_teacher_class_subjects()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_teacher_class_subjects()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.get_teacher_class_subjects()
TO service_role;

COMMIT;
