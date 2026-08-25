-- RPC function to create payment submission with RLS bypass
-- This function uses SECURITY DEFINER to bypass RLS policies
CREATE OR REPLACE FUNCTION create_payment_submission(
  p_student_id UUID,
  p_parent_id UUID,
  p_academic_session_id UUID,
  p_amount DECIMAL,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id UUID;
  v_result JSONB;
BEGIN
  -- Insert the payment submission
  INSERT INTO payment_submissions (
    student_id,
    parent_id,
    academic_session_id,
    amount,
    payment_date,
    payment_method,
    payment_reference,
    bank_name,
    proof_url,
    status,
    accountant_remarks,
    reviewed_by,
    reviewed_at
  ) VALUES (
    p_student_id,
    p_parent_id,
    p_academic_session_id,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_payment_reference,
    p_bank_name,
    p_proof_url,
    'pending',
    NULL,
    NULL,
    NULL
  )
  RETURNING id INTO v_submission_id;
  
  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'error', NULL::TEXT
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'submission_id', NULL::UUID,
      'error', SQLERRM
    );
    RETURN v_result;
END;
$$;
