-- RPC function to approve a payment submission atomically
-- This updates the submission status and creates the official fee_payment record
-- The transaction ensures atomicity - if any part fails, everything rolls back
CREATE OR REPLACE FUNCTION approve_payment_submission(
  p_submission_id UUID,
  p_accountant_id UUID,
  p_remarks TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission RECORD;
  v_fee_payment_id UUID;
  v_result JSONB;
BEGIN
  -- Start transaction (implicit in PostgreSQL function)
  
  -- Lock the submission row to prevent concurrent modifications
  SELECT * INTO v_submission
  FROM payment_submissions
  WHERE id = p_submission_id
  FOR UPDATE;
  
  -- Check if submission exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found';
  END IF;
  
  -- Check if submission is still pending
  IF v_submission.status != 'pending' THEN
    RAISE EXCEPTION 'Submission has already been reviewed';
  END IF;
  
  -- Check if a fee_payment already exists for this submission
  -- This should not happen due to the unique constraint, but we check anyway
  IF EXISTS (
    SELECT 1 FROM fee_payments 
    WHERE payment_submission_id = p_submission_id
  ) THEN
    RAISE EXCEPTION 'Fee payment already exists for this submission';
  END IF;
  
  -- Update the payment submission
  UPDATE payment_submissions
  SET 
    status = 'approved',
    accountant_remarks = p_remarks,
    reviewed_by = p_accountant_id,
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
    p_accountant_id,
    COALESCE(v_submission.payment_reference, 'Payment submission approved'),
    v_submission.payment_method,
    p_submission_id,
    generate_receipt_number()
  )
  RETURNING id INTO v_fee_payment_id;
  
  -- Commit transaction (implicit on successful return)
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'fee_payment_id', v_fee_payment_id,
    'error', NULL::TEXT
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction (implicit on exception)
    v_result := jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'fee_payment_id', NULL::UUID,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;
