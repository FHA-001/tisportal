-- ============================================================
-- B6A-3 — GRADES TABLE LOCKDOWN VERIFICATION
-- ============================================================
-- READ-ONLY structural verification.
--
-- Expected:
--   Every individual check = true
--   Final row "ALL CHECKS PASS" = true

WITH
policy_state AS (
  SELECT
    p.policyname,
    p.cmd,
    p.roles,
    p.qual,
    p.with_check
  FROM pg_policies AS p
  WHERE p.schemaname = 'public'
    AND p.tablename = 'grades'
),
checks AS (

  -- 1. RLS enabled
  SELECT
    1 AS check_order,
    'RLS enabled'::text AS check_name,
    COALESCE((
      SELECT c.relrowsecurity
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'grades'
        AND c.relkind IN ('r','p')
    ), false) AS passed,
    'public.grades must have RLS enabled'::text AS details

  UNION ALL

  -- 2. Exactly one grades policy remains
  SELECT
    2,
    'Only one grades policy remains',
    (SELECT count(*) = 1 FROM policy_state),
    'Expected only grades_select_trusted_admin'

  UNION ALL

  -- 3. Trusted Admin policy exists as authenticated SELECT
  SELECT
    3,
    'Trusted Admin SELECT policy exists',
    EXISTS (
      SELECT 1
      FROM policy_state AS p
      WHERE p.policyname = 'grades_select_trusted_admin'
        AND p.cmd = 'SELECT'
        AND p.roles = ARRAY['authenticated']::name[]
    ),
    'Policy must be SELECT TO authenticated'

  UNION ALL

  -- 4. Trusted Admin policy calls public.is_admin()
  SELECT
    4,
    'Trusted Admin predicate uses is_admin',
    EXISTS (
      SELECT 1
      FROM policy_state AS p
      WHERE p.policyname = 'grades_select_trusted_admin'
        AND lower(COALESCE(p.qual, '')) LIKE '%is_admin%'
    ),
    'RLS predicate must be based on public.is_admin()'

  UNION ALL

  -- 5. No INSERT policy remains
  SELECT
    5,
    'No INSERT policy',
    NOT EXISTS (SELECT 1 FROM policy_state WHERE cmd = 'INSERT'),
    'Direct grades inserts must not be exposed through RLS'

  UNION ALL

  -- 6. No UPDATE policy remains
  SELECT
    6,
    'No UPDATE policy',
    NOT EXISTS (SELECT 1 FROM policy_state WHERE cmd = 'UPDATE'),
    'Direct grades updates must not be exposed through RLS'

  UNION ALL

  -- 7. No DELETE policy remains
  SELECT
    7,
    'No DELETE policy',
    NOT EXISTS (SELECT 1 FROM policy_state WHERE cmd = 'DELETE'),
    'Direct grades deletes must not be exposed through RLS'

  UNION ALL

  -- 8. anon has no table SELECT
  SELECT
    8,
    'anon direct SELECT revoked',
    NOT has_table_privilege('anon', 'public.grades', 'SELECT'),
    'anon must use secure custom-session RPCs'

  UNION ALL

  -- 9. anon has no direct writes
  SELECT
    9,
    'anon direct writes revoked',
    NOT has_table_privilege('anon', 'public.grades', 'INSERT')
      AND NOT has_table_privilege('anon', 'public.grades', 'UPDATE')
      AND NOT has_table_privilege('anon', 'public.grades', 'DELETE'),
    'anon must not directly write public.grades'

  UNION ALL

  -- 10. anon has no surviving per-column privileges
  SELECT
    10,
    'anon column privileges revoked',
    NOT has_any_column_privilege('anon', 'public.grades', 'SELECT')
      AND NOT has_any_column_privilege('anon', 'public.grades', 'INSERT')
      AND NOT has_any_column_privilege('anon', 'public.grades', 'UPDATE')
      AND NOT has_any_column_privilege('anon', 'public.grades', 'REFERENCES'),
    'No explicit column privilege should bypass table lockdown'

  UNION ALL

  -- 11. authenticated has SELECT for Admin UI
  SELECT
    11,
    'authenticated SELECT retained',
    has_table_privilege('authenticated', 'public.grades', 'SELECT'),
    'Admin browser flows require direct SELECT'

  UNION ALL

  -- 12. authenticated has no direct writes
  SELECT
    12,
    'authenticated direct writes revoked',
    NOT has_table_privilege('authenticated', 'public.grades', 'INSERT')
      AND NOT has_table_privilege('authenticated', 'public.grades', 'UPDATE')
      AND NOT has_table_privilege('authenticated', 'public.grades', 'DELETE'),
    'Admin direct writes are not required'

  UNION ALL

  -- 13. authenticated has no write/reference column bypass
  SELECT
    13,
    'authenticated column write privileges revoked',
    NOT has_any_column_privilege('authenticated', 'public.grades', 'INSERT')
      AND NOT has_any_column_privilege('authenticated', 'public.grades', 'UPDATE')
      AND NOT has_any_column_privilege('authenticated', 'public.grades', 'REFERENCES'),
    'Only SELECT should remain available to authenticated'

  UNION ALL

  -- 14. service_role SELECT preserved
  SELECT
    14,
    'service_role SELECT preserved',
    has_table_privilege('service_role', 'public.grades', 'SELECT'),
    'Backend privileged access must remain available'

  UNION ALL

  -- 15. service_role writes preserved
  SELECT
    15,
    'service_role writes preserved',
    has_table_privilege('service_role', 'public.grades', 'INSERT')
      AND has_table_privilege('service_role', 'public.grades', 'UPDATE')
      AND has_table_privilege('service_role', 'public.grades', 'DELETE'),
    'Backend privileged write access must remain available'

  UNION ALL

  -- 16. Student RPC remains executable by anon
  SELECT
    16,
    'Student grades RPC preserved',
    COALESCE(
      has_function_privilege(
        'anon',
        to_regprocedure('public.get_student_grades(text,text,text)'),
        'EXECUTE'
      ),
      false
    ),
    'get_student_grades must remain callable by custom-session clients'

  UNION ALL

  -- 17. Parent RPC remains executable by anon
  SELECT
    17,
    'Parent grades RPC preserved',
    COALESCE(
      has_function_privilege(
        'anon',
        to_regprocedure('public.get_parent_child_grades(text,uuid,text,text)'),
        'EXECUTE'
      ),
      false
    ),
    'get_parent_child_grades must remain callable by custom-session clients'

  UNION ALL

  -- 18. Teacher read RPC remains executable by anon
  SELECT
    18,
    'Teacher grades read RPC preserved',
    COALESCE(
      has_function_privilege(
        'anon',
        to_regprocedure('public.get_teacher_grades(text,uuid,text,text)'),
        'EXECUTE'
      ),
      false
    ),
    'get_teacher_grades must remain callable by custom-session clients'

  UNION ALL

  -- 19. Teacher save RPC remains executable by anon
  SELECT
    19,
    'Teacher grades save RPC preserved',
    COALESCE(
      has_function_privilege(
        'anon',
        to_regprocedure('public.save_teacher_grades(text,jsonb)'),
        'EXECUTE'
      ),
      false
    ),
    'save_teacher_grades must remain callable by custom-session clients'
),
final_results AS (
  SELECT check_order, check_name, passed, details
  FROM checks

  UNION ALL

  SELECT
    99,
    'ALL CHECKS PASS',
    (count(*) = 19 AND bool_and(passed)),
    CASE
      WHEN count(*) = 19 AND bool_and(passed)
      THEN 'PASS - All 19 B6A-3 lockdown checks passed'
      ELSE 'FAIL - ' || count(*) FILTER (WHERE passed) || ' of ' || count(*) || ' checks passed'
    END
  FROM checks
)
SELECT check_name, passed, details
FROM final_results
ORDER BY check_order;
