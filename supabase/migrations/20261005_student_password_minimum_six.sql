-- ============================================================
-- STUDENT PASSWORD MINIMUM REDUCED TO 6 CHARACTERS
-- ============================================================
-- PURPOSE:
--   Reduce Student password minimum requirement from 8 to 6 characters
--   to match the school-wide Supabase Auth policy (minimum 6, no complexity)
--
-- SCOPE:
--   - Student accounts only (custom RPC session auth)
--   - Teacher/Accountant/Parent use Supabase Auth (untouched)
--
-- CONTEXT:
--   - Supabase Auth configured: minimum 6 characters, no complexity requirements
--   - Frontend already updated to minimum 6 characters
--   - This migration updates backend Student RPCs to match
--
-- SECURITY OUTCOMES:
--   - Student passwords now require minimum 6 characters (down from 8)
--   - No complexity requirements (uppercase, lowercase, numbers, symbols)
--   - Bcrypt hashing behavior unchanged
--   - SHA-256 lazy migration behavior unchanged
--   - Authorization and security behavior unchanged
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. UPDATE student_signup PASSWORD VALIDATION
-- ------------------------------------------------------------
-- Reduce minimum from 8 to 6 characters
-- Preserve all other behavior (bcrypt hashing, authorization, etc.)

CREATE OR REPLACE FUNCTION public.student_signup(
  p_full_name TEXT,
  p_username TEXT,
  p_password TEXT,
  p_email TEXT,
  p_phone_number TEXT,
  p_gender TEXT,
  p_class_id TEXT,
  p_tier TEXT,
  p_date_of_birth TEXT,
  p_parent_name TEXT,
  p_parent_phone TEXT,
  p_parent_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_password_hash TEXT;
  v_student_id UUID;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM public.students WHERE username = p_username) THEN
    RETURN jsonb_build_object('error', 'username_exists');
  END IF;

  -- Validate password is at least 6 characters (reduced from 8)
  IF p_password IS NULL OR length(p_password) < 6 THEN
    RETURN jsonb_build_object('error', 'invalid_password');
  END IF;

  -- Hash the password using bcrypt with work factor 10
  v_password_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  -- Insert student with pending status
  INSERT INTO public.students (
    full_name,
    username,
    password_hash,
    email,
    phone_number,
    gender,
    class_id,
    tier,
    date_of_birth,
    parent_name,
    parent_phone,
    parent_email,
    status,
    signup_date,
    must_change_password,
    is_active
  ) VALUES (
    p_full_name,
    p_username,
    v_password_hash,
    p_email,
    p_phone_number,
    p_gender,
    p_class_id::UUID,
    p_tier,
    p_date_of_birth::DATE,
    p_parent_name,
    p_parent_phone,
    p_parent_email,
    'pending',
    NOW(),
    TRUE,
    FALSE
  ) RETURNING id INTO v_student_id;

  RETURN jsonb_build_object('success', true, 'message', 'Signup request submitted. Please wait for admin approval.');
END;
$$;

-- ------------------------------------------------------------
-- 2. UPDATE create_student_by_teacher_auth PASSWORD VALIDATION
-- ------------------------------------------------------------
-- Reduce minimum from 8 to 6 characters
-- Preserve all other behavior (bcrypt hashing, authorization, etc.)

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
  v_password text;
  v_password_hash text;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized_teacher');
  END IF;

  v_class_id := NULLIF(p->>'class_id', '')::uuid;
  v_tier := NULLIF(p->>'tier', '');
  v_password := NULLIF(btrim(p->>'password'), '');

  IF v_class_id IS NULL THEN
    RETURN jsonb_build_object('error', 'class_required');
  END IF;

  -- Password is now plaintext (not pre-hashed by frontend)
  -- Minimum length validation is handled server-side (reduced from 8 to 6)
  IF v_password IS NULL OR length(v_password) < 6 THEN
    RETURN jsonb_build_object('error', 'invalid_password');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = v_teacher_id
      AND cs.class_id = v_class_id
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized_class');
  END IF;

  -- Hash using bcrypt with work factor 10
  v_password_hash := extensions.crypt(v_password, extensions.gen_salt('bf', 10));

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
    v_password_hash,
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

-- ------------------------------------------------------------
-- 3. UPDATE change_password STUDENT BRANCH PASSWORD VALIDATION
-- ------------------------------------------------------------
-- Reduce minimum from 8 to 6 characters
-- Preserve all other behavior (bcrypt hashing, lazy migration, authorization, etc.)

CREATE OR REPLACE FUNCTION public.change_password(
  p_session_token TEXT,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_user_id UUID;
  v_role TEXT;
  v_current_password_hash TEXT;
  v_new_password_hash TEXT;
  v_is_legacy_hash BOOLEAN;
BEGIN
  -- Reject missing or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  -- Validate custom session server-side
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, NULL)
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_session');
  END IF;

  -- Derive identity ONLY from validated session
  v_user_id := v_session.user_id;
  v_role := v_session.role;

  -- Retrieve current password hash for the validated session owner
  IF v_role = 'teacher' OR v_role = 'accountant' THEN
    SELECT password_hash
    INTO v_current_password_hash
    FROM public.teachers
    WHERE id = v_user_id;
  ELSIF v_role = 'student' THEN
    SELECT password_hash
    INTO v_current_password_hash
    FROM public.students
    WHERE id = v_user_id;
  ELSIF v_role = 'parent' THEN
    SELECT password_hash
    INTO v_current_password_hash
    FROM public.parents
    WHERE id = v_user_id;
  ELSE
    RETURN jsonb_build_object('error', 'invalid_role');
  END IF;

  IF v_current_password_hash IS NULL THEN
    RETURN jsonb_build_object('error', 'user_not_found');
  END IF;

  -- Verify current password and hash new password based on role
  IF v_role = 'student' THEN
    -- Student uses bcrypt with lazy migration support
    -- Validate new password is at least 6 characters (reduced from 8)
    IF p_new_password IS NULL OR length(p_new_password) < 6 THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;

    v_is_legacy_hash := v_current_password_hash ~ '^[0-9a-f]{64}$';

    IF v_is_legacy_hash THEN
      -- Legacy SHA-256 verification
      IF encode(extensions.digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex') != v_current_password_hash THEN
        RETURN jsonb_build_object('error', 'invalid_password');
      END IF;
    ELSE
      -- Bcrypt verification (use stored hash as salt)
      IF extensions.crypt(p_current_password, v_current_password_hash) != v_current_password_hash THEN
        RETURN jsonb_build_object('error', 'invalid_password');
      END IF;
    END IF;

    -- Hash new password using bcrypt with work factor 10
    v_new_password_hash := extensions.crypt(p_new_password, extensions.gen_salt('bf', 10));
  ELSE
    -- Preserve existing SHA-256 behavior for teacher/accountant/parent (for compatibility)
    -- Note: These roles now use Supabase Auth, so this branch should ideally not be used
    IF encode(extensions.digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex') != v_current_password_hash THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;

    v_new_password_hash := encode(extensions.digest(p_new_password || 'TIS_SALT_2024', 'sha256'), 'hex');
  END IF;

  -- Update password for the validated session owner
  IF v_role = 'teacher' OR v_role = 'accountant' THEN
    UPDATE public.teachers
    SET
      password_hash = v_new_password_hash,
      must_change_password = FALSE
    WHERE id = v_user_id;
  ELSIF v_role = 'student' THEN
    UPDATE public.students
    SET
      password_hash = v_new_password_hash,
      must_change_password = FALSE
    WHERE id = v_user_id;
  ELSIF v_role = 'parent' THEN
    UPDATE public.parents
    SET
      password_hash = v_new_password_hash,
      must_change_password = FALSE
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMIT;
