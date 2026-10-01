-- A8.3A: Accountant payment-review migration to Supabase Auth
-- Requires public.current_accountant_id() from the auth identity helpers migration.
-- Legacy custom-session overloads are intentionally retained for later A8.7 cleanup.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_all_payment_submissions()
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
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
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
  v_accountant_id UUID;
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
    s.full_name,
    s.admission_number,
    p.full_name,
    p.email,
    a.name
  FROM public.payment_submissions AS ps
  LEFT JOIN public.students AS s
    ON s.id = ps.student_id
  LEFT JOIN public.parents AS p
    ON p.id = ps.parent_id
  LEFT JOIN public.academic_sessions AS a
    ON a.id = ps.academic_session_id
  ORDER BY ps.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_payment_submissions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_all_payment_submissions() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions() TO service_role;


CREATE OR REPLACE FUNCTION public.approve_payment_submission(
  p_submission_id UUID,
  p_remarks TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accountant_id UUID;
  v_submission RECORD;
  v_fee_payment_id UUID;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'unauthorized'
    );
  END IF;

  SELECT *
  INTO v_submission
  FROM public.payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'Submission not found'
    );
  END IF;

  IF v_submission.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'Submission has already been reviewed'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.fee_payments AS fp
    WHERE fp.payment_submission_id = p_submission_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'Fee payment already exists for this submission'
    );
  END IF;

  UPDATE public.payment_submissions
  SET
    status = 'approved',
    accountant_remarks = p_remarks,
    reviewed_by = v_accountant_id,
    reviewed_at = NOW()
  WHERE id = p_submission_id;

  INSERT INTO public.fee_payments (
    student_id,
    term_id,
    amount,
    date_paid,
    recorded_by,
    reference_note,
    payment_method,
    payment_submission_id,
    receipt_number
  )
  VALUES (
    v_submission.student_id,
    v_submission.academic_session_id,
    v_submission.amount,
    v_submission.payment_date,
    v_accountant_id,
    COALESCE(
      v_submission.payment_reference,
      'Payment submission approved'
    ),
    v_submission.payment_method,
    p_submission_id,
    public.generate_receipt_number()
  )
  RETURNING id INTO v_fee_payment_id;

  BEGIN
    PERFORM public.create_notification(
      'parent',
      v_submission.parent_id,
      'Payment Approved',
      'Your payment has been approved successfully.',
      'payment_approved',
      p_submission_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'fee_payment_id', v_fee_payment_id,
    'error', NULL::TEXT
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_submission(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_submission(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT) TO service_role;


CREATE OR REPLACE FUNCTION public.reject_payment_submission(
  p_submission_id UUID,
  p_remarks TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accountant_id UUID;
  v_submission RECORD;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'unauthorized'
    );
  END IF;

  SELECT *
  INTO v_submission
  FROM public.payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'Submission not found'
    );
  END IF;

  IF v_submission.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'Submission has already been reviewed'
    );
  END IF;

  UPDATE public.payment_submissions
  SET
    status = 'rejected',
    accountant_remarks = p_remarks,
    reviewed_by = v_accountant_id,
    reviewed_at = NOW()
  WHERE id = p_submission_id;

  BEGIN
    PERFORM public.create_notification(
      'parent',
      v_submission.parent_id,
      'Payment Rejected',
      'Your payment submission was rejected.',
      'payment_rejected',
      p_submission_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Failed to create notification: %', SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'error', NULL::TEXT
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', SQLERRM
    );
END;
$$;

REVOKE ALL ON FUNCTION public.reject_payment_submission(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_payment_submission(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT) TO service_role;

COMMIT;