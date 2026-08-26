BEGIN;

-- Phase 2C Stage A2: Secure Parent Read RPCs
-- This migration adds secure overloads for parent read RPCs
-- that use session-based authentication instead of trusting client-supplied parent IDs
-- The old insecure overloads remain temporarily unchanged for staged deployment

-- Secure get_parent_children overload with session validation
CREATE OR REPLACE FUNCTION public.get_parent_children(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  student_id UUID,
  relationship TEXT,
  is_primary BOOLEAN,
  student_name TEXT,
  student_admission_number TEXT,
  student_username TEXT,
  student_class_id UUID,
  student_tier TEXT,
  student_class_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_parent_id UUID;
BEGIN
  -- Reject NULL or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;
  
  -- Validate session token and derive parent identity
  -- Require role = 'parent' (teachers, accountants, students are not allowed)
  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'parent')
  WHERE is_valid = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Derive parent ID from validated session
  v_parent_id := v_session.user_id;
  
  -- Return children for the authenticated parent
  RETURN QUERY
  SELECT 
    ps.id,
    ps.parent_id,
    ps.student_id,
    ps.relationship,
    ps.is_primary,
    s.full_name as student_name,
    s.admission_number as student_admission_number,
    s.username as student_username,
    s.class_id as student_class_id,
    s.tier as student_tier,
    c.name as student_class_name
  FROM public.parent_students ps
  LEFT JOIN public.students s ON ps.student_id = s.id
  LEFT JOIN public.classes c ON s.class_id = c.id
  WHERE ps.parent_id = v_parent_id
  ORDER BY ps.is_primary DESC;
END;
$$;

-- Secure get_parent_payment_submissions overload with session validation
CREATE OR REPLACE FUNCTION public.get_parent_payment_submissions(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  parent_id UUID,
  academic_session_id UUID,
  amount NUMERIC,
  payment_date DATE,
  payment_reference TEXT,
  payment_method TEXT,
  bank_name TEXT,
  proof_url TEXT,
  status TEXT,
  accountant_remarks TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  student_name TEXT,
  student_admission_number TEXT,
  academic_session_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_parent_id UUID;
BEGIN
  -- Reject NULL or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;
  
  -- Validate session token and derive parent identity
  -- Require role = 'parent' (teachers, accountants, students are not allowed)
  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'parent')
  WHERE is_valid = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Derive parent ID from validated session
  v_parent_id := v_session.user_id;
  
  -- Return payment submissions for the authenticated parent
  RETURN QUERY
  SELECT 
    ps.id,
    ps.student_id,
    ps.parent_id,
    ps.academic_session_id,
    ps.amount,
    ps.payment_date,
    ps.payment_reference,
    ps.payment_method,
    ps.bank_name,
    ps.proof_url,
    ps.status,
    ps.accountant_remarks,
    ps.reviewed_by,
    ps.reviewed_at,
    ps.created_at,
    ps.updated_at,
    s.full_name AS student_name,
    s.admission_number AS student_admission_number,
    a.name AS academic_session_name
  FROM public.payment_submissions ps
  LEFT JOIN public.students s ON ps.student_id = s.id
  LEFT JOIN public.academic_sessions a ON ps.academic_session_id = a.id
  WHERE ps.parent_id = v_parent_id
  ORDER BY ps.created_at DESC;
END;
$$;

-- Revoke from PUBLIC and authenticated, grant to anon for custom-auth frontend access
-- Old insecure overloads remain unchanged during Stage A2
REVOKE EXECUTE ON FUNCTION public.get_parent_children(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_children(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_children(TEXT) TO anon;

REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) TO anon;

COMMIT;
