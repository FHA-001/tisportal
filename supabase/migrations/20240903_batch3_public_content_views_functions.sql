-- ============================================================
-- TIS PORTAL — BATCH 3 PUBLIC CONTENT / VIEW / FUNCTION SECURITY
-- announcements + newsletters + sensitive views + utility RPC grants
-- ============================================================
-- Manual Supabase execution required.
-- ============================================================

BEGIN;

-- 1. ANNOUNCEMENTS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Parents can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Students can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Teachers can view announcements" ON public.announcements;

DROP POLICY IF EXISTS announcements_anon_select_active ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_select ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_update ON public.announcements;
DROP POLICY IF EXISTS announcements_admin_delete ON public.announcements;

CREATE POLICY announcements_anon_select_active
ON public.announcements
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY announcements_admin_select
ON public.announcements
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY announcements_admin_insert
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY announcements_admin_update
ON public.announcements
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY announcements_admin_delete
ON public.announcements
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.announcements FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.announcements FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.announcements FROM authenticated;

GRANT SELECT ON TABLE public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.announcements TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.announcements TO service_role;

-- 2. NEWSLETTERS
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'newsletters'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.newsletters', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY newsletters_public_select_published
ON public.newsletters
FOR SELECT
TO anon
USING (is_published = true);

CREATE POLICY newsletters_admin_select
ON public.newsletters
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY newsletters_admin_insert
ON public.newsletters
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY newsletters_admin_update
ON public.newsletters
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY newsletters_admin_delete
ON public.newsletters
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.newsletters FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.newsletters FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.newsletters FROM authenticated;

GRANT SELECT ON TABLE public.newsletters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.newsletters TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.newsletters TO service_role;

-- 3. SENSITIVE VIEWS
REVOKE ALL PRIVILEGES ON TABLE public.teachers_directory FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.teachers_directory FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.teachers_directory FROM authenticated;
GRANT SELECT ON TABLE public.teachers_directory TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.teachers_directory TO service_role;

REVOKE ALL PRIVILEGES ON TABLE public.pending_student_signups FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.pending_student_signups FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.pending_student_signups FROM authenticated;
GRANT SELECT ON TABLE public.pending_student_signups TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.pending_student_signups TO service_role;

-- 4. INTERNAL-ONLY UTILITY FUNCTIONS
REVOKE EXECUTE ON FUNCTION public.create_notification(
  text, uuid, text, text, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(
  text, uuid, text, text, text, uuid
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_receipt_number()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_receipt_number()
TO service_role;

COMMIT;
