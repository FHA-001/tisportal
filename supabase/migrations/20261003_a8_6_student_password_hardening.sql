-- ============================================================
-- A8.6D — STUDENT PASSWORD HASHING HARDENING
-- ============================================================
-- PURPOSE:
--   Replace weak SHA-256 + static salt password hashing with bcrypt
--   for Student accounts ONLY, while preserving existing non-Student behavior.
--
-- SCOPE:
--   - Student accounts only (custom RPC session auth)
--   - Teacher/Accountant/Parent use Supabase Auth (untouched)
--   - admin_reset_password: Student branch uses bcrypt, others preserve SHA-256
--   - change_password: Student branch uses bcrypt, others preserve SHA-256
--
-- CONTEXT:
--   - Legacy hash: SHA-256(password || 'TIS_SALT_2024') as 64-char hex
--   - New hash: bcrypt with adaptive work factor (crypt(password, gen_salt('bf', 10)))
--   - pgcrypto extension provides crypt() and gen_salt() functions
--
-- WEAKNESS OF LEGACY HASH:
--   - Fast computation (vulnerable to brute force)
--   - Static shared salt (vulnerable to rainbow tables / precomputed attacks)
--   - No adaptive work factor (hardware improvements reduce security over time)
--
-- MIGRATION STRATEGY:
--   - Lazy/transparent migration on successful legacy login
--   - New passwords use bcrypt immediately
--   - Existing accounts continue working with legacy hash until next successful login
--   - Wrong passwords never trigger migration
--   - Frontend sends plaintext passwords; server handles hashing
--
-- SECURITY OUTCOMES:
--   - All new Student passwords use bcrypt with work factor 10
--   - Existing Students can still log in with legacy passwords
--   - Successful legacy login transparently upgrades to bcrypt
--   - Student custom session architecture unchanged
--   - Teacher/Accountant/Parent Supabase Auth completely untouched
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. ENSURE pgcrypto EXTENSION IS ENABLED
-- ------------------------------------------------------------
-- pgcrypto provides crypt() and gen_salt() for secure password hashing
-- Install in extensions schema for explicit qualification

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------
-- 2. STUDENT PASSWORD CREATION (BCRYPT)
-- ------------------------------------------------------------

-- 2a. Update student_signup to use bcrypt
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

  -- Validate password is at least 8 characters
  IF p_password IS NULL OR length(p_password) < 8 THEN
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

-- 2b. Update create_student_by_teacher_auth to use bcrypt
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
  -- Minimum length validation is handled server-side
  IF v_password IS NULL OR length(v_password) < 8 THEN
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
-- 3. STUDENT PASSWORD RESET (BCRYPT ONLY)
-- ------------------------------------------------------------

-- Update admin_reset_password: Student branch uses bcrypt,
-- preserve existing SHA-256 behavior for teacher/parent (for compatibility)
CREATE OR REPLACE FUNCTION public.admin_reset_password(
  p_role TEXT,
  p_user_id UUID,
  p_default_password TEXT  -- Kept for compatibility, ignored server-side
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id UUID;
  v_default_password TEXT;
  v_password_hash TEXT;
BEGIN
  -- Require Admin authorization
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Server selects default password based on role (ignore browser value)
  CASE p_role
    WHEN 'teacher' THEN
      v_default_password := 'Teacher@12';
    WHEN 'student' THEN
      v_default_password := 'Student@12';
    WHEN 'parent' THEN
      v_default_password := 'Parent@12';
    ELSE
      RETURN jsonb_build_object('error', 'invalid_role');
  END CASE;

  -- Update target account based on role
  IF p_role = 'teacher' THEN
    -- Preserve existing SHA-256 behavior for teacher (for compatibility)
    -- Note: Teacher now uses Supabase Auth, so this branch should ideally not be used
    v_password_hash := encode(extensions.digest(v_default_password || 'TIS_SALT_2024', 'sha256'), 'hex');
    UPDATE public.teachers
    SET
      password_hash = v_password_hash,
      must_change_password = TRUE
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'teacher_not_found');
    END IF;
  ELSIF p_role = 'student' THEN
    -- NEW: Use bcrypt for Student password reset
    v_password_hash := extensions.crypt(v_default_password, extensions.gen_salt('bf', 10));
    UPDATE public.students
    SET
      password_hash = v_password_hash,
      must_change_password = TRUE
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'student_not_found');
    END IF;
  ELSIF p_role = 'parent' THEN
    -- Preserve existing SHA-256 behavior for parent (for compatibility)
    -- Note: Parent now uses Supabase Auth, so this branch should ideally not be used
    v_password_hash := encode(extensions.digest(v_default_password || 'TIS_SALT_2024', 'sha256'), 'hex');
    UPDATE public.parents
    SET
      password_hash = v_password_hash,
      must_change_password = TRUE
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'parent_not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------
-- 4. STUDENT PASSWORD CHANGE (BCRYPT ONLY)
-- ------------------------------------------------------------

-- Update change_password: Student branch uses bcrypt,
-- preserve existing SHA-256 behavior for teacher/accountant/parent (for compatibility)
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
    -- NEW: Student uses bcrypt with lazy migration support
    -- Validate new password is at least 8 characters
    IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
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

-- ------------------------------------------------------------
-- 5. STUDENT LOGIN (LAZY MIGRATION WITH CORRECT ORDERING)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION login_student(
  p_username TEXT,
  p_password_hash TEXT  -- Parameter name preserved for compatibility; now receives plaintext password
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_student RECORD;
  v_password TEXT;  -- Local variable for clarity: p_password_hash is actually plaintext
  v_token TEXT;
  v_token_hash TEXT;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_is_legacy_hash BOOLEAN;
  v_new_password_hash TEXT;
BEGIN
  -- Copy parameter to local variable for clarity
  v_password := p_password_hash;

  -- Verify student credentials
  SELECT id, full_name, username, admission_number, class_id, tier, password_hash, is_active, must_change_password, status
  INTO v_student
  FROM public.students
  WHERE username = p_username
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  -- Detect legacy hash format (64-char lowercase hex = SHA-256)
  v_is_legacy_hash := v_student.password_hash ~ '^[0-9a-f]{64}$';

  -- Verify password
  IF v_is_legacy_hash THEN
    -- Legacy SHA-256 verification
    IF encode(extensions.digest(v_password || 'TIS_SALT_2024', 'sha256'), 'hex') != v_student.password_hash THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  ELSE
    -- Bcrypt verification (use stored hash as salt)
    IF extensions.crypt(v_password, v_student.password_hash) != v_student.password_hash THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
  END IF;

  -- Check account status BEFORE password migration
  IF NOT v_student.is_active THEN
    RETURN jsonb_build_object('error', 'inactive');
  END IF;

  -- Check if student signup is pending approval
  IF v_student.status = 'pending' THEN
    RETURN jsonb_build_object('error', 'pending_approval');
  END IF;

  -- Check if student signup was rejected
  IF v_student.status = 'rejected' THEN
    RETURN jsonb_build_object('error', 'rejected');
  END IF;

  -- Lazy migration: rehash with bcrypt on successful legacy login
  -- Only migrate if account is allowed to login (checked above)
  IF v_is_legacy_hash THEN
    v_new_password_hash := extensions.crypt(v_password, extensions.gen_salt('bf', 10));
    UPDATE public.students
    SET password_hash = v_new_password_hash
    WHERE id = v_student.id;
  END IF;

  -- Generate cryptographically secure session token (32 bytes = 256 bits)
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Hash the token for storage (SHA-256)
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  -- Set expiry to 30 minutes from now
  v_expires_at := NOW() + INTERVAL '30 minutes';

  -- Store session in database
  INSERT INTO public.custom_sessions (
    token_hash,
    user_id,
    role,
    expires_at
  ) VALUES (
    v_token_hash,
    v_student.id,
    'student',
    v_expires_at
  ) RETURNING id INTO v_session_id;

  -- Return existing fields plus session token
  RETURN jsonb_build_object(
    'id', v_student.id,
    'full_name', v_student.full_name,
    'username', v_student.username,
    'admission_number', v_student.admission_number,
    'class_id', v_student.class_id,
    'tier', v_student.tier,
    'must_change_password', v_student.must_change_password,
    'session_token', v_token
  );
END;
$$;

COMMIT;
