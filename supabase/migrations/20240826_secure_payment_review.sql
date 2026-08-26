BEGIN;

-- Phase 2B Stage A: Secure Accountant Payment Review Overloads
-- This migration adds secure overloads for approve/reject payment submission
-- that use session-based authentication instead of trusting client-supplied accountant ID
-- The old insecure overloads remain temporarily unchanged for staged deployment

-- Secure approve_payment_submission overload with session validation
CREATE OR REPLACE FUNCTION public.approve_payment_submission(
  p_submission_id UUID,
  p_remarks TEXT,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_accountant_id UUID;
  v_submission RECORD;
  v_fee_payment_id UUID;
  v_result JSONB;
BEGIN
  -- Reject NULL or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'invalid_session'
    );
  END IF;
  
  -- Validate session token and derive accountant identity
  -- Require role = 'accountant' (teachers, parents, students are not allowed)
  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'accountant')
  WHERE is_valid = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'invalid_session'
    );
  END IF;
  
  -- Derive accountant ID from validated session
  v_accountant_id := v_session.user_id;
  
  -- Lock the submission row to prevent concurrent modifications
  SELECT * INTO v_submission
  FROM payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  
  -- Check if submission exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'Submission not found'
    );
  END IF;
  
  -- Check if submission is still pending
  IF v_submission.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'Submission has already been reviewed'
    );
  END IF;
  
  -- Check if a fee_payment already exists for this submission
  IF EXISTS (
    SELECT 1 FROM fee_payments 
    WHERE payment_submission_id = p_submission_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', 'Fee payment already exists for this submission'
    );
  END IF;
  
  -- Update the payment submission
  UPDATE payment_submissions
  SET 
    status = 'approved',
    accountant_remarks = p_remarks,
    reviewed_by = v_accountant_id,
    reviewed_at = NOW()
  WHERE id = p_submission_id;
  
  -- Create the official fee_payment record with receipt number
  INSERT INTO fee_payments (
    student_id,
    term_id,
    amount,
    date_paid,
    recorded_by,
    reference_note,
    payment_method,
    payment_submission_id,
    receipt_number
  ) VALUES (
    v_submission.student_id,
    v_submission.academic_session_id,
    v_submission.amount,
    v_submission.payment_date,
    v_accountant_id,
    COALESCE(v_submission.payment_reference, 'Payment submission approved'),
    v_submission.payment_method,
    p_submission_id,
    generate_receipt_number()
  )
  RETURNING id INTO v_fee_payment_id;
  
  -- Create parent notification (isolated failure handling)
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
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'fee_payment_id', v_fee_payment_id,
    'error', NULL::TEXT
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction (implicit on exception)
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', SQLERRM
    );
END;
$$;

-- Secure reject_payment_submission overload with session validation
CREATE OR REPLACE FUNCTION public.reject_payment_submission(
  p_submission_id UUID,
  p_remarks TEXT,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_accountant_id UUID;
  v_submission RECORD;
  v_result JSONB;
BEGIN
  -- Reject NULL or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'invalid_session'
    );
  END IF;
  
  -- Validate session token and derive accountant identity
  -- Require role = 'accountant' (teachers, parents, students are not allowed)
  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'accountant')
  WHERE is_valid = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'invalid_session'
    );
  END IF;
  
  -- Derive accountant ID from validated session
  v_accountant_id := v_session.user_id;
  
  -- Lock the submission row to prevent concurrent modifications
  SELECT * INTO v_submission
  FROM payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  
  -- Check if submission exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'Submission not found'
    );
  END IF;
  
  -- Check if submission is still pending
  IF v_submission.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', 'Submission has already been reviewed'
    );
  END IF;
  
  -- Update the payment submission
  UPDATE payment_submissions
  SET 
    status = 'rejected',
    accountant_remarks = p_remarks,
    reviewed_by = v_accountant_id,
    reviewed_at = NOW()
  WHERE id = p_submission_id;
  
  -- Create parent notification (isolated failure handling)
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
  
  -- Return success result
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

-- Revoke from PUBLIC and authenticated, grant to anon for custom-auth frontend access
-- Old insecure overloads remain unchanged during Stage A
REVOKE EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(UUID, TEXT, TEXT) TO anon;

REVOKE EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(UUID, TEXT, TEXT) TO anon;

COMMIT;
