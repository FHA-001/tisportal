-- ============================================================
-- A8.7C PHASE 2 — REMOVE COMPATIBILITY-SESSION BOOTSTRAP
-- ============================================================
-- PURPOSE:
--   Remove the obsolete bootstrap_portal_session() RPC now that
--   Teacher, Accountant, and Parent use Supabase Auth + PortalIdentity
--   exclusively (A8.7C Phase 1 frontend decoupling confirmed by manual testing).
--
-- CONTEXT:
--   - bootstrap_portal_session() was a transitional compatibility layer
--     that created custom_sessions rows for migrated roles during the
--     staged migration from custom auth to Supabase Auth.
--   - Phase 1 removed all frontend dependencies on this RPC.
--   - Manual testing confirmed Teacher/Accountant/Parent flows work
--     without compatibility sessions.
--   - This RPC is now safe to remove.
--
-- SCOPE:
--   - DROP bootstrap_portal_session() only
--   - NO changes to Student custom-session infrastructure
--   - NO changes to get_portal_identity()
--   - NO changes to complete_portal_password_change()
--   - NO changes to public.custom_sessions table
--   - NO changes to any Student RPCs
--   - NO CASCADE (function has no dependencies)
--
-- SAFE DROP CRITERIA MET:
--   - Zero frontend references to bootstrap_portal_session
--   - Zero frontend references to bootstrapCompatibilitySession
--   - Teacher/Accountant/Parent zero p_session_token RPC calls
--   - Teacher/Accountant/Parent zero custom_sessions dependencies
--   - Student custom-session architecture untouched
--   - get_portal_identity() remains
--   - complete_portal_password_change() remains
--   - public.custom_sessions remains (Student only)
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- DROP OBSOLETE COMPATIBILITY-SESSION BOOTSTRAP RPC
-- ------------------------------------------------------------
-- Exact deployed signature (from 20240916_supabase_auth_identity_bootstrap.sql):
--   bootstrap_portal_session() RETURNS jsonb
--   LANGUAGE plpgsql
--   SECURITY DEFINER
--   SET search_path TO ''
--   Takes NO parameters
--
-- This function:
--   - Called get_portal_identity()
--   - Inserted rows into public.custom_sessions for teacher/accountant/parent
--   - Returned a compatibility session token
--   - Is no longer called by any frontend code
--   - Has no database object dependencies (no triggers/views call it)
-- ------------------------------------------------------------

DROP FUNCTION IF EXISTS public.bootstrap_portal_session();

COMMIT;
