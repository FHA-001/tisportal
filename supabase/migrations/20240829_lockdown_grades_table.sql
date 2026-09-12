-- ============================================================
-- B6A-3 — GRADES TABLE LOCKDOWN
-- ============================================================
-- Goal:
--   - Keep trusted Supabase Admin direct SELECT access
--   - Remove all direct anon/authenticated write access
--   - Remove direct anon read access
--   - Keep Teacher/Student/Parent access through existing
--     SECURITY DEFINER RPCs only
--   - Preserve service_role/postgres access
--
-- IMPORTANT:
--   This migration assumes these secure RPCs already exist:
--     get_student_grades(...)
--     get_parent_child_grades(...)
--     get_teacher_grades(...)
--     save_teacher_grades(...)
--
--   Admin UI still reads public.grades directly, so authenticated
--   receives SELECT only, protected by trusted-admin RLS.

BEGIN;

-- ============================================================
-- 1. ENSURE RLS IS ENABLED
-- ============================================================

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. REMOVE ALL LEGACY/PERMISSIVE GRADES POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can delete grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can insert grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can update grades" ON public.grades;
DROP POLICY IF EXISTS "Authenticated users can view grades" ON public.grades;

DROP POLICY IF EXISTS grades_delete_admin ON public.grades;
DROP POLICY IF EXISTS grades_insert_all ON public.grades;
DROP POLICY IF EXISTS grades_select_all ON public.grades;
DROP POLICY IF EXISTS grades_update_all ON public.grades;

-- ============================================================
-- 3. REMOVE DIRECT TABLE PRIVILEGES FROM CLIENT ROLES
-- ============================================================
-- This removes table-level SELECT/INSERT/UPDATE/DELETE and any
-- other direct table privileges from PUBLIC, anon, authenticated.
-- service_role and postgres are intentionally untouched.

REVOKE ALL PRIVILEGES ON TABLE public.grades FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.grades FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.grades FROM authenticated;

-- Also remove any explicit per-column privileges that may survive
-- independently of table-level grants.

REVOKE ALL PRIVILEGES (
  id,
  student_id,
  class_subject_id,
  term,
  session,
  test_1,
  test_2,
  project_1,
  assignment_1,
  exam,
  total,
  grade_letter,
  remark,
  created_at,
  updated_at
) ON TABLE public.grades FROM PUBLIC;

REVOKE ALL PRIVILEGES (
  id,
  student_id,
  class_subject_id,
  term,
  session,
  test_1,
  test_2,
  project_1,
  assignment_1,
  exam,
  total,
  grade_letter,
  remark,
  created_at,
  updated_at
) ON TABLE public.grades FROM anon;

REVOKE ALL PRIVILEGES (
  id,
  student_id,
  class_subject_id,
  term,
  session,
  test_1,
  test_2,
  project_1,
  assignment_1,
  exam,
  total,
  grade_letter,
  remark,
  created_at,
  updated_at
) ON TABLE public.grades FROM authenticated;

-- ============================================================
-- 4. RESTORE ONLY THE DIRECT ACCESS REQUIRED BY ADMIN UI
-- ============================================================
-- The Admin grades page/report-card/ranking flows still perform
-- direct SELECTs using an authenticated Supabase Admin session.

GRANT SELECT ON TABLE public.grades TO authenticated;

-- ============================================================
-- 5. TRUSTED ADMIN SELECT POLICY ONLY
-- ============================================================
-- Generic authenticated users may possess the SELECT table grant,
-- but RLS returns rows only when public.is_admin() confirms the
-- current Supabase Auth user is a trusted Admin.

CREATE POLICY grades_select_trusted_admin
ON public.grades
FOR SELECT
TO authenticated
USING ((SELECT public.is_admin()));

COMMIT;
