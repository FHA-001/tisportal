-- Fix parent login RPC to return single JSON object instead of array
DROP FUNCTION IF EXISTS login_parent(text, text);

CREATE OR REPLACE FUNCTION login_parent(p_email TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_record RECORD;
  result JSONB;
BEGIN
  -- Check if parent exists and password matches
  SELECT 
    parents.id,
    parents.full_name,
    parents.email
  INTO parent_record
  FROM parents
  WHERE parents.email = p_email 
    AND parents.password_hash = p_password_hash
    AND parents.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    -- Check if parent exists but wrong password
    IF EXISTS (SELECT 1 FROM parents WHERE email = p_email) THEN
      result := jsonb_build_object('error', 'invalid_password');
      RETURN result;
    ELSE
      result := jsonb_build_object('error', 'not_found');
      RETURN result;
    END IF;
  END IF;

  -- Return parent data as a single JSON object
  result := jsonb_build_object(
    'id', parent_record.id,
    'full_name', parent_record.full_name,
    'email', parent_record.email,
    'error', NULL::TEXT
  );
  
  RETURN result;
END;
$$;
