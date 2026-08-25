-- Update login_teacher RPC to return role field
-- This is necessary for routing users to the correct dashboard based on their role

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
  SELECT id, full_name, email, password_hash, is_active, must_change_password, role
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
    'must_change_password', v_teacher.must_change_password,
    'role', v_teacher.role
  );
END;
$$;
