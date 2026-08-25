-- RPC function to get parent's payment submissions with student and academic session data
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
