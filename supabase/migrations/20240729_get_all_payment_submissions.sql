-- RPC function to get all payment submissions for accountant review
-- Security: Frontend CustomSessionGuard ensures only accountants can access this page
-- Admins (Supabase Auth) can also execute this RPC
-- Custom auth users (teachers, parents, students) rely on frontend protection
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
    p.full_name AS parent_name,
    p.email AS parent_email,
    a.name AS academic_session_name
  FROM payment_submissions ps
  LEFT JOIN students s ON ps.student_id = s.id
  LEFT JOIN parents p ON ps.parent_id = p.id
  LEFT JOIN academic_sessions a ON ps.academic_session_id = a.id
  ORDER BY ps.created_at DESC;
END;
$$;
