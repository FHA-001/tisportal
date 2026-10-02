-- A8.3D: Accountant Finance Dashboard / Reporting migration to Supabase Auth
-- Adds authenticated zero-argument finance RPCs.
-- Legacy custom-session TEXT overloads remain temporarily for A8.7 cleanup.

BEGIN;

-- ============================================================
-- 1. Accountant fee-payment analytics
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_accountant_fee_payments()
RETURNS TABLE (
  id uuid,
  student_id uuid,
  term_id uuid,
  amount numeric,
  date_paid timestamp with time zone,
  payment_method text,
  receipt_number text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_accountant_id uuid;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized accountant';
  END IF;

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
  ORDER BY fp.date_paid DESC, fp.created_at DESC;
END;
$function$;


-- ============================================================
-- 2. Accountant payment-submission listing
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_all_payment_submissions()
RETURNS TABLE (
  id uuid,
  student_id uuid,
  parent_id uuid,
  academic_session_id uuid,
  amount numeric,
  payment_date date,
  payment_reference text,
  payment_method text,
  bank_name text,
  proof_url text,
  status text,
  accountant_remarks text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  student_name text,
  student_admission_number text,
  parent_name text,
  parent_email text,
  academic_session_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_accountant_id uuid;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized accountant';
  END IF;

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
  LEFT JOIN public.students s
    ON ps.student_id = s.id
  LEFT JOIN public.parents p
    ON ps.parent_id = p.id
  LEFT JOIN public.academic_sessions a
    ON ps.academic_session_id = a.id
  ORDER BY ps.created_at DESC;
END;
$function$;


-- ============================================================
-- 3. Permissions
-- ============================================================

REVOKE ALL
ON FUNCTION public.get_accountant_fee_payments()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_accountant_fee_payments()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_accountant_fee_payments()
TO authenticated, service_role;


REVOKE ALL
ON FUNCTION public.get_all_payment_submissions()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_all_payment_submissions()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_all_payment_submissions()
TO authenticated, service_role;

COMMIT;