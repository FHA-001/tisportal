-- A8.4C: Parent Finance Reads migration to Supabase Auth
-- Requires public.current_parent_id() from the auth identity helpers migration.
-- Legacy custom-session overloads are retained for later A8.7 cleanup.
-- This adds zero-argument overloads that use Supabase Auth via current_parent_id().

BEGIN;

-- ============================================================
-- 1. Create Supabase Auth overload for get_parent_fee_payments
-- ============================================================

CREATE FUNCTION public.get_parent_fee_payments()
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
  v_parent_id UUID;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized parent';
  END IF;

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
-- 2. Create Supabase Auth overload for get_parent_payment_submissions
-- ============================================================

CREATE FUNCTION public.get_parent_payment_submissions()
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
  v_parent_id UUID;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized parent';
  END IF;

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
-- 3. Create Supabase Auth overload for get_parent_school_account_details
-- ============================================================

CREATE FUNCTION public.get_parent_school_account_details()
RETURNS TABLE (
  id uuid,
  bank_name text,
  account_number text,
  account_name text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized parent';
  END IF;

  -- After successful Parent authorization, return active school account details
  RETURN QUERY
  SELECT
    sad.id,
    sad.bank_name,
    sad.account_number,
    sad.account_name,
    sad.is_active,
    sad.created_at,
    sad.updated_at
  FROM public.school_account_details AS sad
  WHERE sad.is_active = true
  ORDER BY sad.updated_at DESC NULLS LAST, sad.created_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- ============================================================
-- 4. Set permissions for new zero-argument overloads
-- ============================================================

-- get_parent_fee_payments()
REVOKE ALL ON FUNCTION public.get_parent_fee_payments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_fee_payments() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments() TO service_role;

-- get_parent_payment_submissions()
REVOKE ALL ON FUNCTION public.get_parent_payment_submissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_payment_submissions() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions() TO service_role;

-- get_parent_school_account_details()
REVOKE ALL ON FUNCTION public.get_parent_school_account_details() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_school_account_details() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parent_school_account_details() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_school_account_details() TO service_role;

COMMIT;
