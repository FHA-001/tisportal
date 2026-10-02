-- A8.4A: Parent Children migration to Supabase Auth
-- Requires public.current_parent_id() from the auth identity helpers migration.
-- Legacy custom-session overloads are retained for later A8.7 cleanup.
-- This adds a zero-argument overload that uses Supabase Auth via current_parent_id().

BEGIN;

-- Create the new Supabase Auth overload (zero arguments)
-- PostgreSQL allows function overloading by parameter types/count
-- This adds a new overload alongside existing get_parent_children(TEXT) and get_parent_children(UUID)
CREATE FUNCTION public.get_parent_children()
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
SET search_path = ''
AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized parent';
  END IF;

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
  FROM public.parent_students ps
  LEFT JOIN public.students s ON ps.student_id = s.id
  LEFT JOIN public.classes c ON s.class_id = c.id
  WHERE ps.parent_id = v_parent_id
  ORDER BY ps.is_primary DESC;
END;
$$;

-- Set permissions for the new zero-argument overload
-- Note: PostgreSQL permissions are set per function name, affecting all overloads
-- This is acceptable as all overloads should have similar permission models
-- The UUID overload requires service-role which is granted here
-- The TEXT overload is for authenticated users which is also granted here
REVOKE ALL ON FUNCTION public.get_parent_children() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_children() FROM anon;

GRANT EXECUTE ON FUNCTION public.get_parent_children() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_children() TO service_role;

COMMIT;
