-- ============================================================
-- TIS PORTAL — VERIFY BATCH 1 SECURITY
-- READ-ONLY
-- ============================================================

WITH checks(check_name, passed, detail) AS (

  SELECT
    '1. parents RLS enabled',
    c.relrowsecurity,
    CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'parents'

  UNION ALL

  SELECT
    '2. anon cannot SELECT parents',
    NOT has_table_privilege('anon', 'public.parents', 'SELECT'),
    CASE WHEN NOT has_table_privilege('anon', 'public.parents', 'SELECT') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '3. anon cannot write parents',
    NOT has_table_privilege('anon', 'public.parents', 'INSERT,UPDATE,DELETE'),
    CASE WHEN NOT has_table_privilege('anon', 'public.parents', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '4. authenticated has required parent CRUD grants',
    has_table_privilege('authenticated', 'public.parents', 'SELECT')
      AND has_table_privilege('authenticated', 'public.parents', 'INSERT')
      AND has_table_privilege('authenticated', 'public.parents', 'UPDATE')
      AND has_table_privilege('authenticated', 'public.parents', 'DELETE'),
    CASE WHEN
      has_table_privilege('authenticated', 'public.parents', 'SELECT')
      AND has_table_privilege('authenticated', 'public.parents', 'INSERT')
      AND has_table_privilege('authenticated', 'public.parents', 'UPDATE')
      AND has_table_privilege('authenticated', 'public.parents', 'DELETE')
    THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '5. parents policies are trusted-admin only',
    COUNT(*) = 4
      AND bool_and(array_to_string(roles, ',') = 'authenticated')
      AND bool_and(
        COALESCE(qual, '') LIKE '%is_admin%'
        OR COALESCE(with_check, '') LIKE '%is_admin%'
      ),
    CASE WHEN COUNT(*) = 4
      AND bool_and(array_to_string(roles, ',') = 'authenticated')
      AND bool_and(
        COALESCE(qual, '') LIKE '%is_admin%'
        OR COALESCE(with_check, '') LIKE '%is_admin%'
      )
    THEN 'PASS' ELSE 'FAIL' END
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'parents'

  UNION ALL

  SELECT
    '6. anon cannot directly read school_account_details',
    NOT has_table_privilege('anon', 'public.school_account_details', 'SELECT'),
    CASE WHEN NOT has_table_privilege('anon', 'public.school_account_details', 'SELECT') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '7. anon cannot write school_account_details',
    NOT has_table_privilege('anon', 'public.school_account_details', 'INSERT,UPDATE,DELETE'),
    CASE WHEN NOT has_table_privilege('anon', 'public.school_account_details', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '8. parent school-account RPC exists',
    to_regprocedure('public.get_parent_school_account_details(text)') IS NOT NULL,
    CASE WHEN to_regprocedure('public.get_parent_school_account_details(text)') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '9. parent school-account RPC is SECURITY DEFINER with empty search_path',
    p.prosecdef
      AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg IN ('search_path=""', 'search_path=')
      ),
    CASE WHEN p.prosecdef
      AND EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg IN ('search_path=""', 'search_path=')
      )
    THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.get_parent_school_account_details(text)')

  UNION ALL

  SELECT
    '10. anon can execute parent school-account RPC',
    has_function_privilege('anon', 'public.get_parent_school_account_details(text)', 'EXECUTE'),
    CASE WHEN has_function_privilege('anon', 'public.get_parent_school_account_details(text)', 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '11. authenticated cannot execute parent school-account RPC',
    NOT has_function_privilege('authenticated', 'public.get_parent_school_account_details(text)', 'EXECUTE'),
    CASE WHEN NOT has_function_privilege('authenticated', 'public.get_parent_school_account_details(text)', 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '12. anon can SELECT payment_accounts',
    has_table_privilege('anon', 'public.payment_accounts', 'SELECT'),
    CASE WHEN has_table_privilege('anon', 'public.payment_accounts', 'SELECT') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '13. anon cannot write payment_accounts',
    NOT has_table_privilege('anon', 'public.payment_accounts', 'INSERT,UPDATE,DELETE'),
    CASE WHEN NOT has_table_privilege('anon', 'public.payment_accounts', 'INSERT,UPDATE,DELETE') THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  SELECT
    '14. authenticated payment-account writes are RLS-admin gated',
    COUNT(*) FILTER (WHERE cmd IN ('INSERT','UPDATE','DELETE')) = 3
      AND bool_and(
        CASE
          WHEN cmd = 'SELECT' THEN true
          ELSE array_to_string(roles, ',') = 'authenticated'
            AND (
              COALESCE(qual, '') LIKE '%is_admin%'
              OR COALESCE(with_check, '') LIKE '%is_admin%'
            )
        END
      ),
    CASE WHEN COUNT(*) FILTER (WHERE cmd IN ('INSERT','UPDATE','DELETE')) = 3
      AND bool_and(
        CASE
          WHEN cmd = 'SELECT' THEN true
          ELSE array_to_string(roles, ',') = 'authenticated'
            AND (
              COALESCE(qual, '') LIKE '%is_admin%'
              OR COALESCE(with_check, '') LIKE '%is_admin%'
            )
        END
      )
    THEN 'PASS' ELSE 'FAIL' END
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'payment_accounts'

  UNION ALL

  SELECT
    '15. service_role access preserved on all three tables',
    has_table_privilege('service_role', 'public.parents', 'SELECT,INSERT,UPDATE,DELETE')
      AND has_table_privilege('service_role', 'public.school_account_details', 'SELECT,INSERT,UPDATE,DELETE')
      AND has_table_privilege('service_role', 'public.payment_accounts', 'SELECT,INSERT,UPDATE,DELETE'),
    CASE WHEN
      has_table_privilege('service_role', 'public.parents', 'SELECT,INSERT,UPDATE,DELETE')
      AND has_table_privilege('service_role', 'public.school_account_details', 'SELECT,INSERT,UPDATE,DELETE')
      AND has_table_privilege('service_role', 'public.payment_accounts', 'SELECT,INSERT,UPDATE,DELETE')
    THEN 'PASS' ELSE 'FAIL' END
)
SELECT
  check_name,
  passed,
  detail
FROM checks
ORDER BY check_name;

SELECT
  COUNT(*) AS total_checks,
  COUNT(*) FILTER (WHERE passed) AS passed_checks,
  COUNT(*) FILTER (WHERE NOT passed) AS failed_checks,
  bool_and(passed) AS all_checks_pass
FROM (
  WITH checks(check_name, passed) AS (
    SELECT 'parents anon select', NOT has_table_privilege('anon', 'public.parents', 'SELECT')
    UNION ALL
    SELECT 'parents anon write', NOT has_table_privilege('anon', 'public.parents', 'INSERT,UPDATE,DELETE')
    UNION ALL
    SELECT 'school details anon select', NOT has_table_privilege('anon', 'public.school_account_details', 'SELECT')
    UNION ALL
    SELECT 'school details anon write', NOT has_table_privilege('anon', 'public.school_account_details', 'INSERT,UPDATE,DELETE')
    UNION ALL
    SELECT 'school details RPC', to_regprocedure('public.get_parent_school_account_details(text)') IS NOT NULL
    UNION ALL
    SELECT 'payment anon select', has_table_privilege('anon', 'public.payment_accounts', 'SELECT')
    UNION ALL
    SELECT 'payment anon write', NOT has_table_privilege('anon', 'public.payment_accounts', 'INSERT,UPDATE,DELETE')
  )
  SELECT * FROM checks
) s;
