-- A8.1 — Supabase Auth identity helpers
-- Purpose:
--   Provide reusable server-side identity helpers for migrated portal roles.
--
-- This migration does NOT:
--   - remove custom_sessions
--   - change Student authentication
--   - change existing Teacher/Accountant/Parent RPC signatures
--   - remove bootstrap_portal_session()
--
-- Those changes happen in later A8 sub-phases.

BEGIN;

-- ============================================================
-- 1. CURRENT TEACHER PROFILE ID
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id
  FROM public.teachers AS t
  WHERE t.auth_user_id = auth.uid()
    AND t.role = 'teacher'
    AND t.is_active = true
    AND t.status = 'Active'
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_teacher_id()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.current_teacher_id()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.current_teacher_id()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.current_teacher_id()
TO service_role;


-- ============================================================
-- 2. CURRENT ACCOUNTANT PROFILE ID
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_accountant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT t.id
  FROM public.teachers AS t
  WHERE t.auth_user_id = auth.uid()
    AND t.role = 'accountant'
    AND t.is_active = true
    AND t.status = 'Active'
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_accountant_id()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.current_accountant_id()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.current_accountant_id()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.current_accountant_id()
TO service_role;


-- ============================================================
-- 3. CURRENT PARENT PROFILE ID
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_parent_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id
  FROM public.parents AS p
  WHERE p.auth_user_id = auth.uid()
    AND p.is_active = true
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_parent_id()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.current_parent_id()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.current_parent_id()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.current_parent_id()
TO service_role;

COMMIT;
