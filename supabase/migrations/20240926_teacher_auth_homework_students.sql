-- A8.2D — Teacher homework + student creation via Supabase Auth
-- Staged rollout: legacy token-based RPCs remain untouched.
-- Student custom auth remains untouched.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_teacher_homework()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  class_id uuid,
  subject_id uuid,
  teacher_id uuid,
  published_at timestamptz,
  due_date date,
  attachment_url text,
  created_at timestamptz,
  updated_at timestamptz,
  class_name text,
  class_tier text,
  subject_name text
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
    h.id,
    h.title::text,
    h.description::text,
    h.class_id,
    h.subject_id,
    h.teacher_id,
    h.published_at,
    h.due_date,
    h.attachment_url::text,
    h.created_at,
    h.updated_at,
    c.name::text,
    c.tier::text,
    s.name::text
  FROM public.homework AS h
  LEFT JOIN public.classes AS c ON c.id = h.class_id
  LEFT JOIN public.subjects AS s ON s.id = h.subject_id
  WHERE h.teacher_id = v_teacher_id
  ORDER BY h.published_at DESC, h.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_teacher_homework() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_homework() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework() TO service_role;

CREATE OR REPLACE FUNCTION public.create_teacher_homework(p_homework jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_class_id uuid;
  v_subject_id uuid;
  v_homework_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_teacher');
  END IF;

  v_class_id := NULLIF(p_homework->>'class_id', '')::uuid;
  v_subject_id := NULLIF(p_homework->>'subject_id', '')::uuid;

  IF NULLIF(btrim(p_homework->>'title'), '') IS NULL
     OR NULLIF(btrim(p_homework->>'description'), '') IS NULL
     OR v_class_id IS NULL
     OR v_subject_id IS NULL
     OR NULLIF(p_homework->>'due_date', '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_required_fields');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
      AND cs.subject_id = v_subject_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_assignment');
  END IF;

  INSERT INTO public.homework (
    title, description, class_id, subject_id, teacher_id, due_date, attachment_url
  )
  VALUES (
    btrim(p_homework->>'title'),
    btrim(p_homework->>'description'),
    v_class_id,
    v_subject_id,
    v_teacher_id,
    (p_homework->>'due_date')::date,
    NULLIF(btrim(p_homework->>'attachment_url'), '')
  )
  RETURNING id INTO v_homework_id;

  RETURN jsonb_build_object('success', true, 'homework_id', v_homework_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_teacher_homework(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_teacher_homework(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_teacher_homework(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_homework(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.update_teacher_homework(
  p_homework_id uuid,
  p_homework jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_class_id uuid;
  v_subject_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_teacher');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.homework AS h
    WHERE h.id = p_homework_id
      AND h.teacher_id = v_teacher_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'homework_not_found');
  END IF;

  v_class_id := NULLIF(p_homework->>'class_id', '')::uuid;
  v_subject_id := NULLIF(p_homework->>'subject_id', '')::uuid;

  IF NULLIF(btrim(p_homework->>'title'), '') IS NULL
     OR NULLIF(btrim(p_homework->>'description'), '') IS NULL
     OR v_class_id IS NULL
     OR v_subject_id IS NULL
     OR NULLIF(p_homework->>'due_date', '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_required_fields');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
      AND cs.subject_id = v_subject_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_assignment');
  END IF;

  UPDATE public.homework AS h
  SET
    title = btrim(p_homework->>'title'),
    description = btrim(p_homework->>'description'),
    class_id = v_class_id,
    subject_id = v_subject_id,
    due_date = (p_homework->>'due_date')::date,
    attachment_url = NULLIF(btrim(p_homework->>'attachment_url'), ''),
    updated_at = now()
  WHERE h.id = p_homework_id
    AND h.teacher_id = v_teacher_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_teacher_homework(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_teacher_homework(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_teacher_homework(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_teacher_homework(uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_teacher_homework(p_homework_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_teacher');
  END IF;

  DELETE FROM public.homework AS h
  WHERE h.id = p_homework_id
    AND h.teacher_id = v_teacher_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'homework_not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_teacher_homework(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_teacher_homework(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_teacher_homework(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_teacher_homework(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.create_student_by_teacher_auth(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_class_id uuid;
  v_tier text;
  v_student_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized_teacher');
  END IF;

  v_class_id := NULLIF(p->>'class_id', '')::uuid;
  v_tier := NULLIF(p->>'tier', '');

  IF v_class_id IS NULL THEN
    RETURN jsonb_build_object('error', 'class_required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized_class');
  END IF;

  INSERT INTO public.students (
    full_name, username, password_hash, email, phone_number, gender,
    admission_number, class_id, tier, date_of_birth,
    parent_name, parent_phone, parent_email,
    status, is_active, must_change_password
  )
  VALUES (
    p->>'full_name',
    p->>'username',
    p->>'password_hash',
    NULLIF(btrim(p->>'email'), ''),
    NULLIF(btrim(p->>'phone_number'), ''),
    NULLIF(btrim(p->>'gender'), ''),
    NULLIF(btrim(p->>'admission_number'), ''),
    v_class_id,
    v_tier,
    NULLIF(p->>'date_of_birth', '')::date,
    NULLIF(btrim(p->>'parent_name'), ''),
    NULLIF(btrim(p->>'parent_phone'), ''),
    NULLIF(btrim(p->>'parent_email'), ''),
    'approved',
    true,
    true
  )
  RETURNING id INTO v_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_student_id,
    'student_id', v_student_id,
    'full_name', p->>'full_name',
    'username', p->>'username'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_by_teacher_auth(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_student_by_teacher_auth(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_student_by_teacher_auth(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_by_teacher_auth(jsonb) TO service_role;

COMMIT;
