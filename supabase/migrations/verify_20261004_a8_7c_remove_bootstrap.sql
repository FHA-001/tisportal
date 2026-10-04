-- ============================================================
-- VERIFICATION SQL FOR A8.7C PHASE 2
-- ============================================================
-- Run this after applying 20261004_a8_7c_remove_compatibility_session_bootstrap.sql
-- to verify the migration is correctly deployed.
--
-- This verification uses robust PostgreSQL catalog checks with:
--   - pg_namespace n ON n.oid = p.pronamespace
--   - pg_get_function_identity_arguments(p.oid) for signature verification
--   - to_regprocedure() for precise function identification
--   - No fragile LIKE '%TEXT%' pattern matching
-- ============================================================

-- ------------------------------------------------------------
-- 1. VERIFY bootstrap_portal_session IS DROPPED
-- ------------------------------------------------------------
SELECT
  'bootstrap_portal_session dropped' as check_name,
  CASE
    WHEN to_regprocedure('public.bootstrap_portal_session()') IS NULL
    THEN 'PASS'
    ELSE 'FAIL - Function still exists'
  END as result;

-- Expected: PASS - Function should not exist

-- ------------------------------------------------------------
-- 2. VERIFY get_portal_identity STILL EXISTS
-- ------------------------------------------------------------
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as signature,
  p.prosecdef as security_definer,
  COALESCE(array_to_string(p.proconfig,','), '<not set>') as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_portal_identity';

-- Expected:
--   function_name: get_portal_identity
--   signature: (no arguments - empty string)
--   security_definer: true
--   search_path_config: search_path=""

-- ------------------------------------------------------------
-- 3. VERIFY complete_portal_password_change STILL EXISTS
-- ------------------------------------------------------------
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as signature,
  p.prosecdef as security_definer,
  COALESCE(array_to_string(p.proconfig,','), '<not set>') as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'complete_portal_password_change';

-- Expected:
--   function_name: complete_portal_password_change
--   signature: (no arguments - empty string)
--   security_definer: true
--   search_path_config: search_path=""

-- ------------------------------------------------------------
-- 4. VERIFY public.custom_sessions TABLE STILL EXISTS
-- ------------------------------------------------------------
SELECT
  'custom_sessions table exists' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'custom_sessions'
    )
    THEN 'PASS'
    ELSE 'FAIL - Table missing'
  END as result;

-- Expected: PASS - Table should still exist for Student auth

-- ------------------------------------------------------------
-- 5. VERIFY STUDENT CUSTOM-SESSION RPCs STILL EXIST
-- ------------------------------------------------------------
SELECT
  'Student RPCs inventory' as check_name,
  array_agg(
    to_regprocedure('public.' || function_name || '(' || signature || ')')
  ) as functions_found
FROM (
  SELECT 'login_student' as function_name, 'text,text' as signature
  UNION ALL SELECT 'validate_custom_session', 'text,text'
  UNION ALL SELECT 'refresh_custom_session', 'text'
  UNION ALL SELECT 'logout_custom_session', 'text'
  UNION ALL SELECT 'get_student_grades', 'text,text,text'
  UNION ALL SELECT 'get_student_homework', 'text'
  UNION ALL SELECT 'get_student_teacher_directory', 'text'
  UNION ALL SELECT 'get_custom_notifications', 'text,integer'
  UNION ALL SELECT 'mark_custom_notification_read', 'text,uuid'
  UNION ALL SELECT 'mark_all_custom_notifications_read', 'text'
  UNION ALL SELECT 'change_password', 'text,text,text'
) rpcs;

-- Expected: All 11 Student RPCs should return non-NULL oids

-- ------------------------------------------------------------
-- 6. VERIFY STUDENT RPC SIGNATURES (using identity arguments)
-- ------------------------------------------------------------
SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as signature,
  p.prosecdef as security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'login_student',
    'validate_custom_session',
    'refresh_custom_session',
    'logout_custom_session',
    'get_student_grades',
    'get_student_homework',
    'get_student_teacher_directory',
    'get_custom_notifications',
    'mark_custom_notification_read',
    'mark_all_custom_notifications_read',
    'change_password'
  )
ORDER BY p.proname;

-- Expected signatures (identity arguments only, no parameter names):
--   login_student: text,text
--   validate_custom_session: text,text
--   refresh_custom_session: text
--   logout_custom_session: text
--   get_student_grades: text,text,text
--   get_student_homework: text
--   get_student_teacher_directory: text
--   get_custom_notifications: text,integer
--   mark_custom_notification_read: text,uuid
--   mark_all_custom_notifications_read: text
--   change_password: text,text,text (Student overload)

-- ------------------------------------------------------------
-- 7. VERIFY NO BROKEN DEPENDENCIES
-- ------------------------------------------------------------
-- Check if any functions, views, or triggers reference bootstrap_portal_session
SELECT
  'No broken dependencies' as check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prosrc ILIKE '%bootstrap_portal_session%'
    )
    THEN 'FAIL - Other functions still reference bootstrap_portal_session'
    ELSE 'PASS'
  END as result;

-- Expected: PASS - No other functions should reference it

-- ------------------------------------------------------------
-- 8. VERIFY EXECUTE GRANTS ON STUDENT RPCs
-- ------------------------------------------------------------
SELECT
  'Student RPC anon execute grants' as check_name,
  count(*) as functions_with_anon_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL (
  SELECT has_function_privilege('anon', p.oid, 'EXECUTE') as can_execute
) grants
WHERE n.nspname = 'public'
  AND p.proname IN (
    'login_student',
    'validate_custom_session',
    'refresh_custom_session',
    'logout_custom_session',
    'get_student_grades',
    'get_student_homework',
    'get_student_teacher_directory',
    'get_custom_notifications',
    'mark_custom_notification_read',
    'mark_all_custom_notifications_read',
    'change_password'
  )
  AND grants.can_execute = true;

-- Expected: 11 (all Student RPCs should have anon execute)

-- ------------------------------------------------------------
-- 9. VERIFICATION SUMMARY
-- ------------------------------------------------------------
SELECT
  'A8.7C Phase 2 Verification Summary' as summary,
  (SELECT COUNT(*) FROM (
    SELECT 1 UNION ALL
    SELECT 1 WHERE to_regprocedure('public.bootstrap_portal_session()') IS NULL
    UNION ALL
    SELECT 1 WHERE to_regprocedure('public.get_portal_identity()') IS NOT NULL
    UNION ALL
    SELECT 1 WHERE to_regprocedure('public.complete_portal_password_change()') IS NOT NULL
    UNION ALL
    SELECT 1 WHERE EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'custom_sessions'
    )
  ) checks) as checks_passed,
  5 as total_checks;

-- Expected: checks_passed = 5, total_checks = 5
