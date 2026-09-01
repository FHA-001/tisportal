-- Secure Accountant finance reads with custom session token
-- This migration adds a secure RPC for Accountant fee-payment analytics
-- enabling finance dashboard and reports without direct table access

BEGIN;

-- ============================================================
-- 1. Create secure get_accountant_fee_payments RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_accountant_fee_payments(
  p_session_token TEXT
)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  term_id UUID,
  amount NUMERIC,
  date_paid TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  receipt_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE
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

  -- Return fee payments for analytics
  -- Authorization: only validated Accountants can access
  RETURN QUERY
  SELECT
    fp.id,
    fp.student_id,
    fp.term_id,
    fp.amount,
    fp.date_paid,
    fp.payment_method,
    fp.receipt_number,
    fp.created_at
  FROM public.fee_payments fp
  ORDER BY fp.date_paid DESC;
END;
$$;

-- ============================================================
-- 2. Grant permissions to get_accountant_fee_payments
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_accountant_fee_payments(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_accountant_fee_payments(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_accountant_fee_payments(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_accountant_fee_payments(TEXT) TO service_role;

COMMIT;
