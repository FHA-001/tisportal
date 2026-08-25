-- RPC function to reject a payment submission
-- This updates the submission status to rejected
-- No fee_payment record is created for rejected submissions
CREATE OR REPLACE FUNCTION reject_payment_submission(
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
  v_result JSONB;
BEGIN
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
  
  -- Update the payment submission
  UPDATE payment_submissions
  SET 
    status = 'rejected',
    accountant_remarks = p_remarks,
    reviewed_by = p_accountant_id,
    reviewed_at = NOW()
  WHERE id = p_submission_id;
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'submission_id', p_submission_id,
    'error', NULL::TEXT
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'submission_id', p_submission_id,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;
