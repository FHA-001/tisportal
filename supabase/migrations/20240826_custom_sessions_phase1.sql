BEGIN;

-- Phase 1: Custom Session Infrastructure
-- Adds server-verifiable session tokens for custom authentication
-- This migration is backward-compatible and does not modify existing user data

-- Create custom_sessions table
CREATE TABLE IF NOT EXISTS custom_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'accountant', 'student', 'parent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL
);

-- Enable RLS and revoke direct access from browser roles
-- custom_sessions must only be accessed via SECURITY DEFINER functions
ALTER TABLE public.custom_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.custom_sessions FROM PUBLIC;
REVOKE ALL ON TABLE public.custom_sessions FROM anon;
REVOKE ALL ON TABLE public.custom_sessions FROM authenticated;

-- Create indexes for efficient lookups
-- Note: token_hash has UNIQUE constraint which creates an index automatically
CREATE INDEX IF NOT EXISTS idx_custom_sessions_user_id ON custom_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_sessions_expires_at ON custom_sessions(expires_at);

-- Create validation helper function
-- This function validates a session token and returns the authenticated user identity
-- SECURITY DEFINER with restricted permissions
CREATE OR REPLACE FUNCTION validate_custom_session(
  p_token TEXT,
  p_required_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  role TEXT,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
BEGIN
  -- Hash the provided token using SHA-256
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  
  -- Return session data if valid
  RETURN QUERY
  SELECT 
    cs.user_id,
    cs.role,
    (cs.expires_at > NOW() AND cs.revoked_at IS NULL)::BOOLEAN AS is_valid
  FROM public.custom_sessions cs
  WHERE cs.token_hash = v_token_hash
    AND cs.expires_at > NOW()
    AND cs.revoked_at IS NULL
    AND (p_required_role IS NULL OR cs.role = p_required_role);
  
  -- Update last_seen_at for activity tracking (only for valid sessions)
  UPDATE public.custom_sessions
  SET last_seen_at = NOW()
  WHERE token_hash = v_token_hash
    AND expires_at > NOW()
    AND revoked_at IS NULL
    AND (p_required_role IS NULL OR role = p_required_role);
END;
$$;

-- Revoke execute permissions on validation helper from public roles
-- Only SECURITY DEFINER functions should use this internally
REVOKE EXECUTE ON FUNCTION validate_custom_session(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION validate_custom_session(TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION validate_custom_session(TEXT, TEXT) FROM authenticated;

-- Update login_teacher RPC to generate and return session token
CREATE OR REPLACE FUNCTION login_teacher(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher RECORD;
  v_token TEXT;
  v_token_hash TEXT;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  -- Verify teacher credentials
  SELECT id, full_name, email, password_hash, is_active, must_change_password, role
  INTO v_teacher
  FROM public.teachers
  WHERE email = p_email
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  
  IF v_teacher.password_hash != p_password_hash THEN
    RETURN jsonb_build_object('error', 'invalid_password');
  END IF;
  
  IF NOT v_teacher.is_active THEN
    RETURN jsonb_build_object('error', 'inactive');
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
    v_teacher.id,
    v_teacher.role,
    v_expires_at
  ) RETURNING id INTO v_session_id;
  
  -- Return existing fields plus session token
  RETURN jsonb_build_object(
    'id', v_teacher.id,
    'full_name', v_teacher.full_name,
    'email', v_teacher.email,
    'must_change_password', v_teacher.must_change_password,
    'role', v_teacher.role,
    'session_token', v_token
  );
END;
$$;

-- Update login_student RPC to generate and return session token
CREATE OR REPLACE FUNCTION login_student(
  p_username TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_token TEXT;
  v_token_hash TEXT;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify student credentials
  SELECT id, full_name, username, admission_number, class_id, tier, password_hash, is_active, must_change_password, status
  INTO v_student
  FROM public.students
  WHERE username = p_username
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  
  IF v_student.password_hash != p_password_hash THEN
    RETURN jsonb_build_object('error', 'invalid_password');
  END IF;
  
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

-- Update login_parent RPC to generate and return session token
CREATE OR REPLACE FUNCTION login_parent(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent RECORD;
  v_token TEXT;
  v_token_hash TEXT;
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify parent credentials
  SELECT id, full_name, email, password_hash, is_active, must_change_password
  INTO v_parent
  FROM public.parents
  WHERE email = p_email
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  
  IF v_parent.password_hash != p_password_hash THEN
    RETURN jsonb_build_object('error', 'invalid_password');
  END IF;
  
  IF NOT v_parent.is_active THEN
    RETURN jsonb_build_object('error', 'inactive');
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
    v_parent.id,
    'parent',
    v_expires_at
  ) RETURNING id INTO v_session_id;
  
  -- Return existing fields plus session token
  RETURN jsonb_build_object(
    'id', v_parent.id,
    'full_name', v_parent.full_name,
    'email', v_parent.email,
    'must_change_password', v_parent.must_change_password,
    'session_token', v_token
  );
END;
$$;

COMMIT;
