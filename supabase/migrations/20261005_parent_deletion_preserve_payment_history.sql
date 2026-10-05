-- Parent deletion with historical payment preservation
-- Adds parent_name snapshot to payment_submissions and changes FK to ON DELETE SET NULL
-- This allows permanent deletion of Parent accounts while preserving all financial records

-- Step 1: Add parent_name column for historical snapshot
ALTER TABLE payment_submissions
ADD COLUMN IF NOT EXISTS parent_name TEXT;

-- Step 2: Backfill existing payment submissions with parent names
-- Only update rows where parent_name is NULL and parent_id is valid
UPDATE payment_submissions ps
SET parent_name = p.full_name
FROM parents p
WHERE ps.parent_id = p.id
  AND ps.parent_name IS NULL;

-- Step 3: Make parent_id nullable
-- First, we need to drop the existing foreign key constraint
-- The constraint was created inline, so PostgreSQL generates a name
-- We need to find and drop it first

-- Drop the existing FK constraint (PostgreSQL auto-generated name)
-- Based on the schema, the constraint is on parent_id referencing parents(id)
ALTER TABLE payment_submissions
DROP CONSTRAINT IF EXISTS payment_submissions_parent_id_fkey;

-- Re-add parent_id as nullable with ON DELETE SET NULL
ALTER TABLE payment_submissions
ALTER COLUMN parent_id DROP NOT NULL;

ALTER TABLE payment_submissions
ADD CONSTRAINT payment_submissions_parent_id_fkey
FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE SET NULL;

-- Step 4: Update create_payment_submission RPC to populate parent_name
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
  v_parent_name TEXT;
  v_result JSONB;
BEGIN
  -- Get parent name for historical snapshot
  SELECT full_name INTO v_parent_name
  FROM parents
  WHERE id = p_parent_id;

  -- Insert the payment submission with parent_name snapshot
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
    reviewed_at,
    parent_name
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
    NULL,
    v_parent_name
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

-- Step 5: Update get_all_payment_submissions RPC to handle nullable parent_id
-- The existing LEFT JOIN already handles this, but we ensure parent_name is returned
CREATE OR REPLACE FUNCTION get_all_payment_submissions()
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
  parent_name TEXT,
  parent_email TEXT,
  academic_session_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    COALESCE(ps.parent_name, p.full_name) AS parent_name,
    p.email AS parent_email,
    a.name AS academic_session_name
  FROM payment_submissions ps
  LEFT JOIN students s ON ps.student_id = s.id
  LEFT JOIN parents p ON ps.parent_id = p.id
  LEFT JOIN academic_sessions a ON ps.academic_session_id = a.id
  ORDER BY ps.created_at DESC;
END;
$$;

-- Step 6: Update get_parent_payment_submissions RPC to handle nullable parent_id
CREATE OR REPLACE FUNCTION get_parent_payment_submissions(p_parent_id UUID)
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
AS $$
BEGIN
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
  FROM payment_submissions ps
  LEFT JOIN students s ON ps.student_id = s.id
  LEFT JOIN academic_sessions a ON ps.academic_session_id = a.id
  WHERE ps.parent_id = p_parent_id
  ORDER BY ps.created_at DESC;
END;
$$;
