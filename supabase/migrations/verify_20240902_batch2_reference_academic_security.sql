-- ============================================================
-- TIS PORTAL — VERIFY BATCH 2 REFERENCE / ACADEMIC SECURITY
-- READ-ONLY
-- ============================================================

WITH targets(table_name) AS (
  VALUES
    ('academic_sessions'::text),
    ('school_fees'),
    ('subjects'),
    ('class_subjects')
),
checks AS (

  -- 1-4: RLS enabled
  SELECT
    'RLS enabled: ' || t.table_name AS check_name,
    c.relrowsecurity AS passed
  FROM targets t
  JOIN pg_namespace n ON n.nspname = 'public'
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = t.table_name

  UNION ALL

  -- 5-8: anon can SELECT
  SELECT
    'anon SELECT allowed: ' || t.table_name,
    has_table_privilege('anon', format('public.%I', t.table_name), 'SELECT')
  FROM targets t

  UNION ALL

  -- 9-12: anon cannot write
  SELECT
    'anon writes blocked: ' || t.table_name,
    NOT has_table_privilege(
      'anon',
      format('public.%I', t.table_name),
      'INSERT,UPDATE,DELETE'
    )
  FROM targets t

  UNION ALL

  -- 13-16: authenticated can SELECT
  SELECT
    'authenticated SELECT allowed: ' || t.table_name,
    has_table_privilege(
      'authenticated',
      format('public.%I', t.table_name),
      'SELECT'
    )
  FROM targets t

  UNION ALL

  -- 17-20: authenticated has write grants (RLS must gate them)
  SELECT
    'authenticated write grants present: ' || t.table_name,
    has_table_privilege(
      'authenticated',
      format('public.%I', t.table_name),
      'INSERT'
    )
    AND has_table_privilege(
      'authenticated',
      format('public.%I', t.table_name),
      'UPDATE'
    )
    AND has_table_privilege(
      'authenticated',
      format('public.%I', t.table_name),
      'DELETE'
    )
  FROM targets t

  UNION ALL

  -- 21-24: exactly one read policy + three admin write policies
  SELECT
    'policy shape correct: ' || t.table_name,
    (
      COUNT(*) = 4
      AND COUNT(*) FILTER (
        WHERE cmd = 'SELECT'
          AND array_to_string(roles, ',') IN ('anon,authenticated','authenticated,anon')
          AND qual = 'true'
      ) = 1
      AND COUNT(*) FILTER (
        WHERE cmd IN ('INSERT','UPDATE','DELETE')
          AND array_to_string(roles, ',') = 'authenticated'
          AND (
            COALESCE(qual, '') LIKE '%is_admin%'
            OR COALESCE(with_check, '') LIKE '%is_admin%'
          )
      ) = 3
    )
  FROM targets t
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename = t.table_name
  GROUP BY t.table_name

  UNION ALL

  -- 25-28: no write policy assigned to PUBLIC/anon
  SELECT
    'no public/anon write policy: ' || t.table_name,
    NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = t.table_name
        AND p.cmd IN ('INSERT','UPDATE','DELETE','ALL')
        AND (
          'public' = ANY(p.roles)
          OR 'anon' = ANY(p.roles)
        )
    )
  FROM targets t

  UNION ALL

  -- 29-32: service role preserved
  SELECT
    'service_role CRUD preserved: ' || t.table_name,
    has_table_privilege(
      'service_role',
      format('public.%I', t.table_name),
      'SELECT'
    )
    AND has_table_privilege(
      'service_role',
      format('public.%I', t.table_name),
      'INSERT'
    )
    AND has_table_privilege(
      'service_role',
      format('public.%I', t.table_name),
      'UPDATE'
    )
    AND has_table_privilege(
      'service_role',
      format('public.%I', t.table_name),
      'DELETE'
    )
  FROM targets t
)
SELECT
  check_name,
  passed,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_name;

WITH targets(table_name) AS (
  VALUES
    ('academic_sessions'::text),
    ('school_fees'),
    ('subjects'),
    ('class_subjects')
),
checks AS (
  SELECT c.relrowsecurity AS passed
  FROM targets t
  JOIN pg_namespace n ON n.nspname = 'public'
  JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = t.table_name

  UNION ALL
  SELECT has_table_privilege('anon', format('public.%I', t.table_name), 'SELECT')
  FROM targets t

  UNION ALL
  SELECT NOT has_table_privilege('anon', format('public.%I', t.table_name), 'INSERT,UPDATE,DELETE')
  FROM targets t

  UNION ALL
  SELECT has_table_privilege('authenticated', format('public.%I', t.table_name), 'SELECT')
  FROM targets t

  UNION ALL
  SELECT
    has_table_privilege('service_role', format('public.%I', t.table_name), 'SELECT')
    AND has_table_privilege('service_role', format('public.%I', t.table_name), 'INSERT')
    AND has_table_privilege('service_role', format('public.%I', t.table_name), 'UPDATE')
    AND has_table_privilege('service_role', format('public.%I', t.table_name), 'DELETE')
  FROM targets t
)
SELECT
  COUNT(*) AS total_checks,
  COUNT(*) FILTER (WHERE passed) AS passed_checks,
  COUNT(*) FILTER (WHERE NOT passed) AS failed_checks,
  bool_and(passed) AS all_checks_pass
FROM checks;
