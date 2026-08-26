BEGIN;

-- Phase 2A: Secure create_student_by_teacher with session validation
-- This migration adds server-side authentication and authorization to the teacher student creation RPC

CREATE OR REPLACE FUNCTION public.create_student_by_teacher(
  p jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_token TEXT;
  v_session RECORD;
  v_teacher_id UUID;
  v_class_id UUID;
  v_student_id UUID;
  v_result JSONB;
BEGIN
  -- Extract session token from payload
  v_session_token := p->>'session_token';
  
  -- Validate session token and derive teacher identity
  -- Require role = 'teacher' (accountants are not allowed)
  SELECT * INTO v_session
  FROM public.validate_custom_session(v_session_token, 'teacher')
  WHERE is_valid = true
  LIMIT 1;
  
  IF NOT FOUND OR v_session_token IS NULL OR v_session_token = '' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;
  
  -- Derive teacher ID from validated session
  v_teacher_id := v_session.user_id;
  
  -- Extract class_id from payload
  v_class_id := (p->>'class_id')::UUID;
  
  -- Verify teacher is authorized to create students in this class
  -- Teacher must have a class_subjects assignment for this class
  IF NOT EXISTS (
    SELECT 1 FROM public.class_subjects
    WHERE teacher_id = v_teacher_id
      AND class_id = v_class_id
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized_class');
  END IF;
  
  -- Insert student with all existing fields
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
    status
  ) VALUES (
    p->>'full_name',
    p->>'username',
    p->>'password_hash',
    p->>'email',
    p->>'phone_number',
    p->>'gender',
    p->>'admission_number',
    v_class_id,
    p->>'tier',
    NULLIF(p->>'date_of_birth', '')::DATE,
    p->>'parent_name',
    p->>'parent_phone',
    p->>'parent_email',
    'approved'
  ) RETURNING id INTO v_student_id;
  
  -- Return success with student details
  RETURN jsonb_build_object(
    'id', v_student_id,
    'full_name', p->>'full_name',
    'username', p->>'username',
    'admission_number', p->>'admission_number'
  );
END;
$$;

-- Revoke from PUBLIC, grant to anon for custom-auth frontend access
REVOKE EXECUTE ON FUNCTION public.create_student_by_teacher(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_student_by_teacher(JSONB) TO anon;

COMMIT;
