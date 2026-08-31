-- Migration: Optional Manual Admission Numbers
-- Purpose: Remove automatic admission number generation, allow manual optional entry
-- Date: 2024-08-27

BEGIN;

-- Secure create_student_by_teacher with manual optional admission number
CREATE OR REPLACE FUNCTION public.create_student_by_teacher(p JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_token TEXT;
  v_session RECORD;
  v_teacher_id UUID;
  v_class_id UUID;
  v_tier TEXT;
  v_student_id UUID;
BEGIN
  -- Extract session token
  v_session_token := p->>'session_token';

  IF v_session_token IS NULL OR v_session_token = '' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  -- Validate session using secure validator
  SELECT * INTO v_session
  FROM public.validate_custom_session(v_session_token, 'teacher')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  -- Derive teacher_id from validated session
  v_teacher_id := v_session.user_id;

  -- Extract class_id
  v_class_id := (p->>'class_id')::UUID;
  v_tier := p->>'tier';

  IF v_class_id IS NULL THEN
    RETURN jsonb_build_object('error', 'class_required');
  END IF;

  -- Verify teacher is authorized for this class
  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized_class');
  END IF;

  -- Insert student with optional manual admission number
  -- Use NULLIF to convert blank strings to NULL
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
    is_active,
    must_change_password
  ) VALUES (
    p->>'full_name',
    p->>'username',
    p->>'password_hash',
    p->>'email',
    p->>'phone_number',
    p->>'gender',
    NULLIF(TRIM(p->>'admission_number'), ''),
    v_class_id,
    v_tier,
    NULLIF(p->>'date_of_birth', '')::DATE,
    p->>'parent_name',
    p->>'parent_phone',
    p->>'parent_email',
    'approved',
    TRUE,
    TRUE
  ) RETURNING id INTO v_student_id;

  -- Return success with student details
  RETURN jsonb_build_object(
    'id', v_student_id,
    'full_name', p->>'full_name',
    'username', p->>'username',
    'admission_number', NULLIF(TRIM(p->>'admission_number'), '')
  );
END;
$$;

-- Set permissions for create_student_by_teacher
REVOKE EXECUTE ON FUNCTION public.create_student_by_teacher(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_student_by_teacher(JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_by_teacher(JSONB) TO anon;

-- Secure approve_student_signup with admin authorization
CREATE OR REPLACE FUNCTION public.approve_student_signup(
  p_student_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_student RECORD;
BEGIN
  -- Require admin authorization
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Derive admin_id from auth context, not from parameter
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Get pending student details
  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'student_not_found_or_not_pending');
  END IF;

  -- Update student status WITHOUT generating admission number
  -- Preserve existing admission_number if present, leave NULL if not
  UPDATE public.students
  SET
    status = 'approved',
    is_active = TRUE,
    approved_by = v_admin_id,
    approved_date = NOW()
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true,
    'admission_number', v_student.admission_number,
    'message', 'Student approved successfully'
  );
END;
$$;

-- Set permissions for approve_student_signup
REVOKE EXECUTE ON FUNCTION public.approve_student_signup(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_student_signup(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_student_signup(UUID, UUID) TO authenticated;

COMMIT;
