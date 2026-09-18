-- ============================================================
-- TIS PORTAL — BATCH 2 REFERENCE / ACADEMIC SECURITY HARDENING
-- academic_sessions + school_fees + subjects + class_subjects
-- ============================================================
-- Security model:
-- * Read-only reference/assignment data remains available to anon and
--   authenticated clients because existing Parent/Teacher/Accountant flows
--   depend on browser reads.
-- * ALL writes are restricted to trusted Supabase-auth Admins via is_admin().
-- * service_role access is preserved.
--
-- Manual Supabase execution required.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helper macro pattern repeated per table:
--   RLS enabled
--   old broad policies removed
--   SELECT allowed to anon/authenticated
--   writes allowed only to authenticated + is_admin()
--   broad table grants removed then minimally restored
-- ------------------------------------------------------------

-- ============================================================
-- 1. ACADEMIC SESSIONS
-- ============================================================

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_sessions_select_all ON public.academic_sessions;
DROP POLICY IF EXISTS academic_sessions_write_admin ON public.academic_sessions;
DROP POLICY IF EXISTS academic_sessions_read_all ON public.academic_sessions;
DROP POLICY IF EXISTS academic_sessions_admin_insert ON public.academic_sessions;
DROP POLICY IF EXISTS academic_sessions_admin_update ON public.academic_sessions;
DROP POLICY IF EXISTS academic_sessions_admin_delete ON public.academic_sessions;

CREATE POLICY academic_sessions_read_all
ON public.academic_sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY academic_sessions_admin_insert
ON public.academic_sessions
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY academic_sessions_admin_update
ON public.academic_sessions
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY academic_sessions_admin_delete
ON public.academic_sessions
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.academic_sessions FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.academic_sessions FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.academic_sessions FROM authenticated;

GRANT SELECT ON TABLE public.academic_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.academic_sessions TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.academic_sessions TO service_role;

-- ============================================================
-- 2. SCHOOL FEES
-- ============================================================

ALTER TABLE public.school_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view school fees" ON public.school_fees;
DROP POLICY IF EXISTS "Authenticated users can delete school fees" ON public.school_fees;
DROP POLICY IF EXISTS "Authenticated users can insert school fees" ON public.school_fees;
DROP POLICY IF EXISTS "Authenticated users can update school fees" ON public.school_fees;
DROP POLICY IF EXISTS school_fees_read_all ON public.school_fees;
DROP POLICY IF EXISTS school_fees_admin_insert ON public.school_fees;
DROP POLICY IF EXISTS school_fees_admin_update ON public.school_fees;
DROP POLICY IF EXISTS school_fees_admin_delete ON public.school_fees;

CREATE POLICY school_fees_read_all
ON public.school_fees
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY school_fees_admin_insert
ON public.school_fees
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY school_fees_admin_update
ON public.school_fees
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY school_fees_admin_delete
ON public.school_fees
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.school_fees FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.school_fees FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.school_fees FROM authenticated;

GRANT SELECT ON TABLE public.school_fees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.school_fees TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.school_fees TO service_role;

-- ============================================================
-- 3. SUBJECTS
-- ============================================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subjects_select_all ON public.subjects;
DROP POLICY IF EXISTS subjects_write_admin ON public.subjects;
DROP POLICY IF EXISTS subjects_read_all ON public.subjects;
DROP POLICY IF EXISTS subjects_admin_insert ON public.subjects;
DROP POLICY IF EXISTS subjects_admin_update ON public.subjects;
DROP POLICY IF EXISTS subjects_admin_delete ON public.subjects;

CREATE POLICY subjects_read_all
ON public.subjects
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY subjects_admin_insert
ON public.subjects
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY subjects_admin_update
ON public.subjects
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY subjects_admin_delete
ON public.subjects
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.subjects FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.subjects FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.subjects FROM authenticated;

GRANT SELECT ON TABLE public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subjects TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.subjects TO service_role;

-- ============================================================
-- 4. CLASS SUBJECTS
-- ============================================================

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_subjects_select_all ON public.class_subjects;
DROP POLICY IF EXISTS class_subjects_write_admin ON public.class_subjects;
DROP POLICY IF EXISTS class_subjects_read_all ON public.class_subjects;
DROP POLICY IF EXISTS class_subjects_admin_insert ON public.class_subjects;
DROP POLICY IF EXISTS class_subjects_admin_update ON public.class_subjects;
DROP POLICY IF EXISTS class_subjects_admin_delete ON public.class_subjects;

CREATE POLICY class_subjects_read_all
ON public.class_subjects
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY class_subjects_admin_insert
ON public.class_subjects
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY class_subjects_admin_update
ON public.class_subjects
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY class_subjects_admin_delete
ON public.class_subjects
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.class_subjects FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.class_subjects FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.class_subjects FROM authenticated;

GRANT SELECT ON TABLE public.class_subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.class_subjects TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.class_subjects TO service_role;

COMMIT;
