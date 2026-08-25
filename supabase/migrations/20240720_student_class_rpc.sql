-- RPC function for students to get their own class_id
-- This function bypasses RLS to allow students to view their own class information
DROP FUNCTION IF EXISTS get_student_class(UUID);

CREATE OR REPLACE FUNCTION get_student_class(p_student_id UUID)
RETURNS TABLE (
  class_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.class_id
  FROM students s
  WHERE s.id = p_student_id;
END;
$$;
