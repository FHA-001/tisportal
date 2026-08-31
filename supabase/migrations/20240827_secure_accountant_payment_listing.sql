-- Secure get_all_payment_submissions with custom session token
-- This migration adds a secure TEXT overload that validates the Accountant
-- session token server-side instead of allowing unrestricted access

BEGIN;

-- ============================================================
-- 1. Create secure TEXT overload for get_all_payment_submissions
-- ============================================================

-- New secure overload that uses session token for authentication
CREATE OR REPLACE FUNCTION public.get_all_payment_submissions(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  parent_id UUID,
  academic_session_id UUID,
  amount DECIMAL,
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
  parent_name TEXT,
  parent_email TEXT,
  academic_session_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_accountant_id UUID;
BEGIN
  -- Reject missing or empty session token by returning zero rows
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate Accountant session server-side
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'accountant')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Derive Accountant identity from validated session
  v_accountant_id := v_session.user_id;

  -- Return payment submissions with exact same schema as original function
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
    p.full_name AS parent_name,
    p.email AS parent_email,
    a.name AS academic_session_name
  FROM public.payment_submissions ps
  LEFT JOIN public.students s ON ps.student_id = s.id
  LEFT JOIN public.parents p ON ps.parent_id = p.id
  LEFT JOIN public.academic_sessions a ON ps.academic_session_id = a.id
  ORDER BY ps.created_at DESC;
END;
$$;

-- ============================================================
-- 2. Grant permissions to new TEXT overload
-- ============================================================

-- Custom-auth users call as anon, so grant to anon only
REVOKE EXECUTE ON FUNCTION public.get_all_payment_submissions(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_payment_submissions(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions(TEXT) TO anon;

-- Preserve service_role administrative access
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions(TEXT) TO service_role;

-- ============================================================
-- 3. Revoke browser access from old zero-argument overload
-- ============================================================

-- Old zero-argument overload should not be callable from browser
REVOKE EXECUTE ON FUNCTION public.get_all_payment_submissions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_payment_submissions() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_payment_submissions() FROM authenticated;

-- Preserve postgres/service_role administrative access
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions() TO postgres;
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions() TO service_role;

COMMIT;
