-- Trusted Admin Foundation Migration
-- This migration creates a secure admin registry and hardens parent_students access
-- based on trusted admin verification instead of user-writable metadata

BEGIN;

-- ============================================================
-- 1. CREATE TRUSTED ADMIN REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users
ENABLE ROW LEVEL SECURITY;

-- Revoke all client access - only server role should manage this table
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_users FROM anon;
REVOKE ALL ON TABLE public.admin_users FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.admin_users
TO service_role;
-- ============================================================
-- 2. SEED ONLY VERIFIED LEGITIMATE ADMINS
-- ============================================================

INSERT INTO public.admin_users (user_id)
VALUES
  ('72fdc410-4bf9-4450-b74e-1e0df2c0b52e'::UUID),
  ('c6daea1f-fd5a-4815-aa37-f51143fd5785'::UUID)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. CREATE TRUSTED is_admin() FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
  );
$$;

-- Permissions: Only authenticated users and service role can call this
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- ============================================================
-- 4. REMOVE OLD parent_students POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Admins can insert parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Admins can update parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Admins can view all parent_students" ON public.parent_students;
DROP POLICY IF EXISTS "Parents can view their student relationships" ON public.parent_students;

-- ============================================================
-- 5. ENABLE RLS ON parent_students
-- ============================================================

ALTER TABLE public.parent_students
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. CREATE TRUSTED ADMIN-ONLY POLICIES
-- ============================================================

-- Admins can view all parent_students
CREATE POLICY "Admins can view all parent_students"
ON public.parent_students
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin()));

-- Admins can insert parent_students
CREATE POLICY "Admins can insert parent_students"
ON public.parent_students
FOR INSERT
TO authenticated
WITH CHECK ((SELECT public.is_admin()));

-- Admins can update parent_students
CREATE POLICY "Admins can update parent_students"
ON public.parent_students
FOR UPDATE
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Admins can delete parent_students
CREATE POLICY "Admins can delete parent_students"
ON public.parent_students
FOR DELETE
TO authenticated
USING ((SELECT public.is_admin()));

-- ============================================================
-- 7. LOCK DOWN parent_students GRANTS
-- ============================================================

-- Revoke all direct access
REVOKE ALL ON TABLE public.parent_students FROM PUBLIC;
REVOKE ALL ON TABLE public.parent_students FROM anon;
REVOKE ALL ON TABLE public.parent_students FROM authenticated;

-- Grant authenticated only the required operations
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.parent_students
TO authenticated;

-- ============================================================
-- 8. CREATE SECURE ADMIN CHILDREN RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_parent_children_by_admin(
  p_parent_id UUID
)
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
BEGIN
  -- Verify caller is authenticated admin using trusted registry
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;
  
  -- Return children for specified parent (data input, not identity)
  RETURN QUERY
  SELECT
    ps.id,
    ps.parent_id,
    ps.student_id,
    ps.relationship,
    ps.is_primary,
    s.full_name AS student_name,
    s.admission_number AS student_admission_number,
    s.username AS student_username,
    s.class_id AS student_class_id,
    s.tier AS student_tier,
    c.name AS student_class_name
  FROM public.parent_students ps
  LEFT JOIN public.students s ON ps.student_id = s.id
  LEFT JOIN public.classes c ON s.class_id = c.id
  WHERE ps.parent_id = p_parent_id
  ORDER BY ps.is_primary DESC;
END;
$$;

-- ============================================================
-- 9. ADMIN RPC PERMISSIONS
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_parent_children_by_admin(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_children_by_admin(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parent_children_by_admin(UUID) TO authenticated;

COMMIT;
