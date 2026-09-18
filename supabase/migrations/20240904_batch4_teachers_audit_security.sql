-- ============================================================
-- TIS PORTAL — BATCH 4 TEACHERS + AUDIT LOGS SECURITY
-- ============================================================
-- Manual Supabase execution required.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TEACHERS TABLE
-- Admin direct CRUD only.
-- Custom Teacher login and role workflows continue through SECURITY DEFINER RPCs.
-- ============================================================

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;
DROP POLICY IF EXISTS teachers_all_admin ON public.teachers;

DROP POLICY IF EXISTS teachers_admin_select ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_insert ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_update ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_delete ON public.teachers;

CREATE POLICY teachers_admin_select
ON public.teachers
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY teachers_admin_insert
ON public.teachers
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY teachers_admin_update
ON public.teachers
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY teachers_admin_delete
ON public.teachers
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.teachers FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.teachers FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.teachers FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teachers TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.teachers TO service_role;

-- ============================================================
-- 2. SECURE STUDENT TEACHER DIRECTORY RPC
-- Replaces direct anon access to teachers_directory.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_student_teacher_directory(
  p_session_token text
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone_number text,
  gender text,
  date_of_birth date,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session record;
BEGIN
  IF p_session_token IS NULL OR btrim(p_session_token) = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'student')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid student session';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.full_name,
    t.email,
    t.phone_number,
    t.gender,
    t.date_of_birth,
    t.status,
    t.created_at,
    t.updated_at
  FROM public.teachers AS t
  WHERE COALESCE(t.status, 'active') = 'active'
  ORDER BY t.full_name ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_teacher_directory(text)
FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_teacher_directory(text)
TO anon, service_role;

-- Direct view access stays blocked for custom-auth/anon users.
REVOKE ALL PRIVILEGES ON TABLE public.teachers_directory FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.teachers_directory FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.teachers_directory FROM authenticated;
GRANT SELECT ON TABLE public.teachers_directory TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.teachers_directory TO service_role;

-- ============================================================
-- 3. AUDIT LOGS
-- Immutable from browser clients: Admin can read and append only.
-- No anon access, no authenticated UPDATE/DELETE.
-- ============================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_delete_admin ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_all ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;

DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_admin_insert ON public.audit_logs;

CREATE POLICY audit_logs_admin_select
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY audit_logs_admin_insert
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.audit_logs TO service_role;

COMMIT;
