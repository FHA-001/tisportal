-- Secure Parent fee-payment reads with custom session token
-- This migration adds a secure RPC for Parent fee-payment history
-- and hardens the existing secure Parent submissions RPC

BEGIN;

-- ============================================================
-- 1. Create secure get_parent_fee_payments RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_parent_fee_payments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  term_id UUID,
  amount NUMERIC,
  date_paid TIMESTAMP WITH TIME ZONE,
  recorded_by UUID,
  reference_note TEXT,
  payment_method TEXT,
  receipt_number TEXT,
  payment_submission_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  student_name TEXT,
  student_admission_number TEXT,
  academic_session_name TEXT,
  parent_id UUID,
  parent_name TEXT,
  parent_email TEXT,
  proof_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_parent_id UUID;
BEGIN
  -- Reject missing or empty session token by returning zero rows
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate Parent session server-side
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'parent')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Derive Parent identity from validated session
  v_parent_id := v_session.user_id;

  -- Return fee payments for this Parent's linked children
  -- Authorization: fee payment is visible only when student_id belongs to a linked child
  RETURN QUERY
  SELECT
    fp.id,
    fp.student_id,
    fp.term_id,
    fp.amount,
    fp.date_paid,
    fp.recorded_by,
    fp.reference_note,
    fp.payment_method,
    fp.receipt_number,
    fp.payment_submission_id,
    fp.created_at,
    fp.updated_at,
    s.full_name AS student_name,
    s.admission_number AS student_admission_number,
    a.name AS academic_session_name,
    v_parent_id AS parent_id,
    pr.full_name AS parent_name,
    pr.email AS parent_email,
    ps.proof_url
  FROM public.fee_payments fp
  INNER JOIN public.students s ON s.id = fp.student_id
  INNER JOIN public.academic_sessions a ON a.id = fp.term_id
  INNER JOIN public.parents pr ON pr.id = v_parent_id
  LEFT JOIN public.payment_submissions ps ON ps.id = fp.payment_submission_id AND ps.parent_id = v_parent_id
  WHERE EXISTS (
    SELECT 1
    FROM public.parent_students link
    WHERE link.parent_id = v_parent_id
      AND link.student_id = fp.student_id
  )
  ORDER BY fp.date_paid DESC;
END;
$$;

-- ============================================================
-- 2. Grant permissions to get_parent_fee_payments
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_parent_fee_payments(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_fee_payments(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments(TEXT) TO service_role;

-- ============================================================
-- 3. Harden existing secure get_parent_payment_submissions(TEXT)
-- ============================================================

-- Update search_path to empty string for security
CREATE OR REPLACE FUNCTION public.get_parent_payment_submissions(
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
  academic_session_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_parent_id UUID;
BEGIN
  -- Reject missing or empty session token by returning zero rows
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN;
  END IF;

  -- Validate Parent session server-side
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'parent')
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Derive Parent identity from validated session
  v_parent_id := v_session.user_id;

  -- Return payment submissions for this Parent
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
  LEFT JOIN public.students s ON s.id = ps.student_id
  LEFT JOIN public.academic_sessions a ON a.id = ps.academic_session_id
  WHERE ps.parent_id = v_parent_id
  ORDER BY ps.created_at DESC;
END;
$$;

-- ============================================================
-- 4. Preserve secure TEXT overload permissions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions(TEXT) TO service_role;

-- ============================================================
-- 5. Ensure UUID overload remains browser blocked
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) TO service_role;

COMMIT;
