-- A8.2D HOTFIX — Teacher student creation integrity
-- Prevent plaintext password_hash values and ensure Teacher-created students
-- satisfy the active roster filters.
--
-- Parent-account provisioning is intentionally NOT added here because real
-- Parent accounts are created through the provision-portal-user Edge Function.

BEGIN;

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
  v_password_hash text;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized_teacher');
  END IF;

  v_class_id := NULLIF(p->>'class_id', '')::uuid;
  v_tier := NULLIF(p->>'tier', '');
  v_password_hash := NULLIF(btrim(p->>'password_hash'), '');

  IF v_class_id IS NULL THEN
    RETURN jsonb_build_object('error', 'class_required');
  END IF;

  -- The application login flow uses a 64-character lowercase/uppercase hex
  -- SHA-256 value. Refuse plaintext or malformed values instead of storing them.
  IF v_password_hash IS NULL
     OR v_password_hash !~ '^[0-9A-Fa-f]{64}$' THEN
    RETURN jsonb_build_object('error', 'invalid_password_hash');
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
    full_name,
    username,
    password_hash,
    email,
    phone_number,
    gender,
    admission_number,
    class_id,
    tier,
    date_of_birth,
    parent_name,
    parent_phone,
    parent_email,
    status,
    enrollment_status,
    is_active,
    must_change_password
  )
  VALUES (
    NULLIF(btrim(p->>'full_name'), ''),
    NULLIF(btrim(p->>'username'), ''),
    lower(v_password_hash),
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
    'active',
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
