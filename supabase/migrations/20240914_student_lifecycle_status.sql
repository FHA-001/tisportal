-- Phase 3A: Student lifecycle status
-- Separates signup approval state from enrollment lifecycle state.
-- Apply manually in Supabase SQL Editor.

BEGIN;

-- 1. Add a dedicated lifecycle field.
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS enrollment_status text;

-- 2. Backfill existing rows from the current approval/activity model.
UPDATE public.students
SET enrollment_status = CASE
  WHEN status = 'approved' AND COALESCE(is_active, false) = true THEN 'active'
  ELSE 'inactive'
END
WHERE enrollment_status IS NULL
   OR enrollment_status NOT IN ('active', 'inactive', 'graduated', 'withdrawn');

-- 3. Future rows default to inactive until explicitly activated by an
--    approved creation/approval workflow.
ALTER TABLE public.students
ALTER COLUMN enrollment_status SET DEFAULT 'inactive';

ALTER TABLE public.students
ALTER COLUMN enrollment_status SET NOT NULL;

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_enrollment_status_check;

ALTER TABLE public.students
ADD CONSTRAINT students_enrollment_status_check
CHECK (enrollment_status IN ('active', 'inactive', 'graduated', 'withdrawn'));

-- 4. status is an approval field, not a lifecycle field.
--    Fix the invalid legacy default ('Active') so it matches the existing
--    students_status_check constraint.
ALTER TABLE public.students
ALTER COLUMN status SET DEFAULT 'approved';

-- Keep account activity synchronized with lifecycle status whenever the
-- lifecycle field is written. Active students can log in; all archived
-- lifecycle states remain inactive.
CREATE OR REPLACE FUNCTION public.sync_student_enrollment_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.is_active := (NEW.enrollment_status = 'active');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_student_enrollment_activity ON public.students;

CREATE TRIGGER trg_sync_student_enrollment_activity
BEFORE INSERT OR UPDATE OF enrollment_status
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_enrollment_activity();

-- 5. Approved student signups become active enrolled students.
CREATE OR REPLACE FUNCTION public.approve_student_signup(
  p_student_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_admin_id uuid;
  v_student record;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT *
  INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'student_not_found_or_not_pending');
  END IF;

  UPDATE public.students
  SET
    status = 'approved',
    enrollment_status = 'active',
    is_active = true,
    approved_by = v_admin_id,
    approved_date = now()
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'admission_number', v_student.admission_number,
    'message', 'Student approved successfully'
  );
END;
$function$;

-- 6. Rejected signup requests remain inactive.
CREATE OR REPLACE FUNCTION public.reject_student_signup(
  p_student_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_admin_id uuid;
  v_student record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  v_admin_id := auth.uid();

  SELECT *
  INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'student_not_found_or_not_pending');
  END IF;

  UPDATE public.students
  SET
    status = 'rejected',
    enrollment_status = 'inactive',
    is_active = false,
    approved_by = v_admin_id,
    approved_date = now()
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Student signup request rejected'
  );
END;
$function$;

-- 7. Teacher-created students are approved + active immediately.
CREATE OR REPLACE FUNCTION public.create_student_by_teacher(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_session_token text;
  v_session record;
  v_teacher_id uuid;
  v_class_id uuid;
  v_tier text;
  v_student_id uuid;
BEGIN
  v_session_token := p->>'session_token';

  IF v_session_token IS NULL OR v_session_token = '' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(v_session_token, 'teacher')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  v_teacher_id := v_session.user_id;
  v_class_id := (p->>'class_id')::uuid;
  v_tier := p->>'tier';

  IF v_class_id IS NULL THEN
    RETURN jsonb_build_object('error', 'class_required');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects cs
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
  ) VALUES (
    p->>'full_name',
    p->>'username',
    p->>'password_hash',
    p->>'email',
    p->>'phone_number',
    p->>'gender',
    NULLIF(trim(p->>'admission_number'), ''),
    v_class_id,
    v_tier,
    NULLIF(p->>'date_of_birth', '')::date,
    p->>'parent_name',
    p->>'parent_phone',
    p->>'parent_email',
    'approved',
    'active',
    true,
    true
  )
  RETURNING id INTO v_student_id;

  RETURN jsonb_build_object(
    'id', v_student_id,
    'full_name', p->>'full_name',
    'username', p->>'username',
    'admission_number', NULLIF(trim(p->>'admission_number'), '')
  );
END;
$function$;

-- 8. Teachers should only receive currently active enrolled students.
--    Return signature is kept unchanged to avoid breaking the frontend.
CREATE OR REPLACE FUNCTION public.get_students_by_teacher(
  p_class_id uuid,
  p_session_token text
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
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_teacher_id uuid;
  v_is_valid boolean;
BEGIN
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  SELECT is_valid, user_id
  INTO v_is_valid, v_teacher_id
  FROM public.validate_custom_session(p_session_token, 'teacher');

  IF NOT v_is_valid OR v_teacher_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects cs
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
    jsonb_build_object('name', c.name, 'tier', c.tier)
  FROM public.students s
  LEFT JOIN public.classes c ON s.class_id = c.id
  WHERE s.class_id = p_class_id
    AND s.status = 'approved'
    AND s.enrollment_status = 'active'
    AND COALESCE(s.is_active, false) = true
  ORDER BY s.full_name ASC;
END;
$function$;

COMMIT;
