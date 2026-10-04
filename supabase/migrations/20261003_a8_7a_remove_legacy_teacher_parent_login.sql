-- ============================================================
-- A8.7A — REMOVE LEGACY TEACHER/PARENT LOGIN RPCs
-- ============================================================
-- PURPOSE:
--   Remove obsolete custom-auth login RPCs for Teacher and Parent.
--   Both roles now authenticate exclusively through Supabase Auth
--   via loginPortalUser().
--
-- SCOPE:
--   - DROP login_teacher (custom email/password auth)
--   - DROP login_parent (custom email/password auth)
--   - Student custom authentication remains unchanged
--   - No changes to login_student, validate_custom_session, or other
--     Student authentication infrastructure
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- DROP LEGACY TEACHER LOGIN RPC
-- ------------------------------------------------------------
-- Teacher now uses Supabase Auth via loginPortalUser()
-- This custom email/password login is no longer called by the frontend

DROP FUNCTION IF EXISTS public.login_teacher(TEXT, TEXT);

-- ------------------------------------------------------------
-- DROP LEGACY PARENT LOGIN RPC
-- ------------------------------------------------------------
-- Parent now uses Supabase Auth via loginPortalUser()
-- This custom email/password login is no longer called by the frontend

DROP FUNCTION IF EXISTS public.login_parent(TEXT, TEXT);

COMMIT;
