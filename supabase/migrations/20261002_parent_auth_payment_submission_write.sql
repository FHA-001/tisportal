-- A8.4D: Parent Payment Submission WRITE migration to Supabase Auth
-- Requires public.current_parent_id() from the auth identity helpers migration.
-- Legacy custom-session overload is retained for later A8.7 cleanup.
-- This adds a new overload that uses Supabase Auth via current_parent_id().

BEGIN;

-- ============================================================
-- Create Supabase Auth overload for create_payment_submission
-- ============================================================

CREATE FUNCTION public.create_payment_submission(
  p_student_id UUID,
  p_academic_session_id UUID,
  p_amount NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_payment_reference TEXT,
  p_bank_name TEXT,
  p_proof_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_id UUID;
  v_submission_id UUID;
  v_accountant RECORD;
BEGIN
  -- Derive parent identity from Supabase Auth
  v_parent_id := public.current_parent_id();

  -- Reject unauthenticated users or non-Parents
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'submission_id', NULL::UUID,
      'error', 'unauthorized'
    );
  END IF;

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

-- ============================================================
-- Set permissions for new Supabase Auth overload
-- ============================================================

-- Grant to authenticated (Supabase Auth users) only
REVOKE ALL ON FUNCTION public.create_payment_submission(
  UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment_submission(
  UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_payment_submission(
  UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_submission(
  UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMIT;
