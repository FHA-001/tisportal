BEGIN;

-- Phase 2C Stage A1: Secure Parent Payment Submission Overload
-- This migration adds a secure overload for create_payment_submission
-- that uses session-based authentication instead of trusting client-supplied parent ID
-- The old insecure overload remains temporarily unchanged for staged deployment

-- Secure create_payment_submission overload with session validation
CREATE OR REPLACE FUNCTION public.create_payment_submission(
  p_student_id UUID,
  p_academic_session_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_bank_name TEXT,
  p_proof_url TEXT,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_parent_id UUID;
  v_submission_id UUID;
  v_accountant RECORD;
BEGIN
  -- Reject NULL or empty session token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', NULL::UUID,
      'error', 'invalid_session'
    );
  END IF;
  
  -- Validate session token and derive parent identity
  -- Require role = 'parent' (teachers, accountants, students are not allowed)
  SELECT * INTO v_session
  FROM public.validate_custom_session(p_session_token, 'parent')
  WHERE is_valid = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', NULL::UUID,
      'error', 'invalid_session'
    );
  END IF;
  
  -- Derive parent ID from validated session
  v_parent_id := v_session.user_id;
  
  -- Authorize: verify parent-student relationship exists
  IF NOT EXISTS (
    SELECT 1
    FROM public.parent_students
    WHERE parent_id = v_parent_id
      AND student_id = p_student_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', NULL::UUID,
      'error', 'unauthorized_student'
    );
  END IF;
  
  -- Insert the payment submission
  INSERT INTO public.payment_submissions (
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
    v_parent_id,
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
  
  -- Create accountant notifications (isolated failure handling)
  BEGIN
    FOR v_accountant IN
      SELECT id
      FROM public.teachers
      WHERE role = 'accountant'
    LOOP
      BEGIN
        PERFORM public.create_notification(
          'accountant',
          v_accountant.id,
          'New Payment Submission',
          'A new payment submission has been received and is awaiting review.',
          'payment_submitted',
          v_submission_id
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE
            'Failed to create notification for accountant %: %',
            v_accountant.id,
            SQLERRM;
      END;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE
        'Failed to create notifications for accountants: %',
        SQLERRM;
  END;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'error', NULL::TEXT
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback transaction (implicit on exception)
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', NULL::UUID,
      'error', SQLERRM
    );
END;
$$;

-- Revoke from PUBLIC and authenticated, grant to anon for custom-auth frontend access
-- Old insecure overload remains unchanged during Stage A1
REVOKE EXECUTE ON FUNCTION public.create_payment_submission(UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_payment_submission(UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_submission(UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

COMMIT;
