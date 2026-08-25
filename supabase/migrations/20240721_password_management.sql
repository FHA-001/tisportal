-- Password Management Migration
-- Adds must_change_password flag to user tables for forcing password changes

-- Add must_change_password column to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Add must_change_password column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Add must_change_password column to parents table
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Create RPC for changing password (verifies current password, sets new, clears flag)
DROP FUNCTION IF EXISTS change_password(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION change_password(
  p_user_id UUID,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
  v_new_password_hash TEXT;
  v_role TEXT;
  v_result JSONB;
BEGIN
  -- Hash the passwords using the same salt as the login functions
  v_password_hash := encode(digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex');
  v_new_password_hash := encode(digest(p_new_password || 'TIS_SALT_2024', 'sha256'), 'hex');
  
  -- Determine which table to check based on user_id
  -- Try teachers first
  SELECT password_hash INTO v_password_hash FROM teachers WHERE id = p_user_id;
  IF FOUND THEN
    v_role := 'teacher';
    -- Verify current password
    IF v_password_hash != encode(digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex') THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
    -- Update password and clear must_change_password flag
    UPDATE teachers 
    SET password_hash = v_new_password_hash, must_change_password = FALSE 
    WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
  END IF;
  
  -- Try students
  SELECT password_hash INTO v_password_hash FROM students WHERE id = p_user_id;
  IF FOUND THEN
    v_role := 'student';
    IF v_password_hash != encode(digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex') THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
    UPDATE students 
    SET password_hash = v_new_password_hash, must_change_password = FALSE 
    WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
  END IF;
  
  -- Try parents
  SELECT password_hash INTO v_password_hash FROM parents WHERE id = p_user_id;
  IF FOUND THEN
    v_role := 'parent';
    IF v_password_hash != encode(digest(p_current_password || 'TIS_SALT_2024', 'sha256'), 'hex') THEN
      RETURN jsonb_build_object('error', 'invalid_password');
    END IF;
    UPDATE parents 
    SET password_hash = v_new_password_hash, must_change_password = FALSE 
    WHERE id = p_user_id;
    RETURN jsonb_build_object('success', true);
  END IF;
  
  -- User not found
  RETURN jsonb_build_object('error', 'user_not_found');
END;
$$;

-- Create RPC for admin password reset (sets default password and forces change)
DROP FUNCTION IF EXISTS admin_reset_password(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION admin_reset_password(
  p_role TEXT,
  p_user_id UUID,
  p_default_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  -- Hash the default password
  v_password_hash := encode(digest(p_default_password || 'TIS_SALT_2024', 'sha256'), 'hex');
  
  -- Update based on role
  IF p_role = 'teacher' THEN
    UPDATE teachers 
    SET password_hash = v_password_hash, must_change_password = TRUE 
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'teacher_not_found');
    END IF;
  ELSIF p_role = 'student' THEN
    UPDATE students 
    SET password_hash = v_password_hash, must_change_password = TRUE 
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'student_not_found');
    END IF;
  ELSIF p_role = 'parent' THEN
    UPDATE parents 
    SET password_hash = v_password_hash, must_change_password = TRUE 
    WHERE id = p_user_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('error', 'parent_not_found');
    END IF;
  ELSE
    RETURN jsonb_build_object('error', 'invalid_role');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Update login_teacher RPC to return must_change_password flag
DROP FUNCTION IF EXISTS login_teacher(TEXT, TEXT);

CREATE OR REPLACE FUNCTION login_teacher(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher RECORD;
  v_result JSONB;
BEGIN
  SELECT id, full_name, email, password_hash, is_active, must_change_password
  INTO v_teacher
  FROM teachers
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
  
  RETURN jsonb_build_object(
    'id', v_teacher.id,
    'full_name', v_teacher.full_name,
    'email', v_teacher.email,
    'must_change_password', v_teacher.must_change_password
  );
END;
$$;

-- Update login_student RPC to return must_change_password flag and check status
DROP FUNCTION IF EXISTS login_student(TEXT, TEXT);

CREATE OR REPLACE FUNCTION login_student(
  p_username TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_result JSONB;
BEGIN
  SELECT id, full_name, username, admission_number, class_id, tier, password_hash, is_active, must_change_password, status
  INTO v_student
  FROM students
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
  
  RETURN jsonb_build_object(
    'id', v_student.id,
    'full_name', v_student.full_name,
    'username', v_student.username,
    'admission_number', v_student.admission_number,
    'class_id', v_student.class_id,
    'tier', v_student.tier,
    'must_change_password', v_student.must_change_password
  );
END;
$$;

-- Update login_parent RPC to return must_change_password flag
DROP FUNCTION IF EXISTS login_parent(TEXT, TEXT);

CREATE OR REPLACE FUNCTION login_parent(
  p_email TEXT,
  p_password_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent RECORD;
  v_result JSONB;
BEGIN
  SELECT id, full_name, email, password_hash, is_active, must_change_password
  INTO v_parent
  FROM parents
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
  
  RETURN jsonb_build_object(
    'id', v_parent.id,
    'full_name', v_parent.full_name,
    'email', v_parent.email,
    'must_change_password', v_parent.must_change_password
  );
END;
$$;
