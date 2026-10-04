-- ============================================================
-- VERIFICATION SQL FOR A8.6E CORRECTIVE MIGRATION
-- ============================================================
-- Run this after applying 20261003_a8_6_fix_validate_custom_session_ambiguity.sql
-- to verify the fix is correctly deployed.

-- ------------------------------------------------------------
-- 1. VERIFY validate_custom_session SIGNATURE
-- ------------------------------------------------------------
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as signature,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'validate_custom_session';

-- Expected signature:
-- validate_custom_session(p_token text, p_required_role text DEFAULT NULL)

-- ------------------------------------------------------------
-- 2. VERIFY SECURITY DEFINER AND search_path
-- ------------------------------------------------------------
SELECT
  p.proname as function_name,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  COALESCE(array_to_string(p.proconfig,','), '<not set>') as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'validate_custom_session';

-- Expected:
-- security: SECURITY DEFINER
-- search_path_config: search_path=""

-- ------------------------------------------------------------
-- 3. VERIFY EXECUTE GRANTS
-- ------------------------------------------------------------
SELECT
  grantee,
  CASE
    WHEN has_function_privilege(grantee, 'public.validate_custom_session(text,text)', 'EXECUTE')
    THEN 'YES'
    ELSE 'NO'
  END as can_execute
FROM (
  SELECT 'PUBLIC' as grantee
  UNION SELECT 'anon'
  UNION SELECT 'authenticated'
  UNION SELECT 'service_role'
) roles;

-- Expected:
-- PUBLIC: NO
-- anon: NO
-- authenticated: NO
-- service_role: YES

-- ------------------------------------------------------------
-- 4. VERIFY THE FIX - CHECK FOR TABLE ALIAS IN UPDATE
-- ------------------------------------------------------------
SELECT
  CASE
    WHEN pg_get_functiondef(p.oid) ~ 'UPDATE public\.custom_sessions AS cs'
    THEN 'FIXED - Table alias used'
    ELSE 'NOT FIXED - Missing table alias'
  END as update_fix_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'validate_custom_session';

-- Expected: FIXED - Table alias used

-- ------------------------------------------------------------
-- 5. TEST THE FUNCTION WITH A VALID SESSION TOKEN
-- ------------------------------------------------------------
-- WARNING: Replace the placeholder with an actual valid session token
-- from your custom_sessions table for testing purposes only.
-- DO NOT commit or share real session tokens.

SELECT * FROM public.validate_custom_session('YOUR_SESSION_TOKEN_HERE', 'student');

-- Expected: Returns one row with user_id, role='student', is_valid=true
-- for a valid, non-expired, non-revoked session token.
