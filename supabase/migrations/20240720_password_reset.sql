-- Password reset functions for teachers, students, and parents
-- Uses md5(random()::text) for compatibility with older PostgreSQL versions

-- Request password reset - generates a token and returns it
CREATE OR REPLACE FUNCTION request_password_reset(p_role TEXT, p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  reset_token TEXT;
  expiry_timestamp TIMESTAMP WITH TIME ZONE;
  result JSONB;
BEGIN
  -- Generate a random token using md5 of random string for compatibility
  reset_token := encode(decode(md5(random()::text || clock_timestamp()::text), 'hex'), 'hex');
  expiry_timestamp := now() + interval '1 hour';
  
  -- Try to find the user based on role and identifier (email only for teachers/parents, username or admission for students)
  IF p_role = 'teacher' THEN
    SELECT id INTO user_record 
    FROM teachers 
    WHERE email = p_identifier
    LIMIT 1;
  ELSIF p_role = 'student' THEN
    SELECT id INTO user_record 
    FROM students 
    WHERE username = p_identifier OR admission_number = p_identifier
    LIMIT 1;
  ELSIF p_role = 'parent' THEN
    SELECT id INTO user_record 
    FROM parents 
    WHERE email = p_identifier
    LIMIT 1;
  END IF;
  
  IF NOT FOUND THEN
    result := jsonb_build_object('error', 'not_found');
    RETURN result;
  END IF;
  
  -- Store the reset token
  INSERT INTO password_reset_tokens (user_id, user_role, token, expires_at)
  VALUES (user_record.id, p_role, reset_token, expiry_timestamp)
  ON CONFLICT (user_id, user_role) 
  DO UPDATE SET 
    token = EXCLUDED.token,
    expires_at = EXCLUDED.expires_at;
  
  result := jsonb_build_object('token', reset_token);
  RETURN result;
END;
$$;

-- Reset password with token
CREATE OR REPLACE FUNCTION reset_password_with_token(p_role TEXT, p_token TEXT, p_new_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_record RECORD;
  result JSONB;
BEGIN
  -- Find valid token
  SELECT user_id INTO token_record
  FROM password_reset_tokens
  WHERE user_role = p_role 
    AND token = p_token 
    AND expires_at > now()
  LIMIT 1;
  
  IF NOT FOUND THEN
    result := jsonb_build_object('error', 'invalid_or_expired');
    RETURN result;
  END IF;
  
  -- Update password based on role
  IF p_role = 'teacher' THEN
    UPDATE teachers 
    SET password_hash = p_new_password_hash 
    WHERE id = token_record.user_id;
  ELSIF p_role = 'student' THEN
    UPDATE students 
    SET password_hash = p_new_password_hash 
    WHERE id = token_record.user_id;
  ELSIF p_role = 'parent' THEN
    UPDATE parents 
    SET password_hash = p_new_password_hash 
    WHERE id = token_record.user_id;
  END IF;
  
  -- Delete the used token
  DELETE FROM password_reset_tokens 
  WHERE user_id = token_record.user_id AND user_role = p_role;
  
  result := jsonb_build_object('success', true);
  RETURN result;
END;
$$;

-- Create password_reset_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, user_role)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
