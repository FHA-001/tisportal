-- RPC function for parents to get their children with student data
-- This function bypasses RLS to allow parents to view their assigned children

DROP FUNCTION IF EXISTS get_parent_children(UUID);

CREATE OR REPLACE FUNCTION get_parent_children(p_parent_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  student_id UUID,
  relationship TEXT,
  is_primary BOOLEAN,
  student_name TEXT,
  student_admission_number TEXT,
  student_username TEXT,
  student_class_id UUID,
  student_tier TEXT,
  student_class_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.parent_id,
    ps.student_id,
    ps.relationship,
    ps.is_primary,
    s.full_name as student_name,
    s.admission_number as student_admission_number,
    s.username as student_username,
    s.class_id as student_class_id,
    s.tier as student_tier,
    c.name as student_class_name
  FROM parent_students ps
  LEFT JOIN students s ON ps.student_id = s.id
  LEFT JOIN classes c ON s.class_id = c.id
  WHERE ps.parent_id = p_parent_id
  ORDER BY ps.is_primary DESC;
END;
$$;
