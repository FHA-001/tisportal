-- ============================================================
-- VERIFY BATCH 4 — READ ONLY
-- ============================================================

WITH checks(check_name, passed) AS (

  SELECT
    'teachers RLS enabled',
    c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='teachers'

  UNION ALL
  SELECT
    'teachers anon direct SELECT blocked',
    NOT has_table_privilege('anon','public.teachers','SELECT')

  UNION ALL
  SELECT
    'teachers anon direct writes blocked',
    NOT has_table_privilege('anon','public.teachers','INSERT,UPDATE,DELETE')

  UNION ALL
  SELECT
    'teachers authenticated CRUD grants present',
    has_table_privilege('authenticated','public.teachers','SELECT')
    AND has_table_privilege('authenticated','public.teachers','INSERT')
    AND has_table_privilege('authenticated','public.teachers','UPDATE')
    AND has_table_privilege('authenticated','public.teachers','DELETE')

  UNION ALL
  SELECT
    'teachers exactly four trusted-admin policies',
    COUNT(*) = 4
    AND bool_and(array_to_string(roles,',')='authenticated')
    AND bool_and(
      COALESCE(qual,'') LIKE '%is_admin%'
      OR COALESCE(with_check,'') LIKE '%is_admin%'
    )
  FROM pg_policies
  WHERE schemaname='public' AND tablename='teachers'

  UNION ALL
  SELECT
    'student teacher-directory RPC exists',
    to_regprocedure('public.get_student_teacher_directory(text)') IS NOT NULL

  UNION ALL
  SELECT
    'student teacher-directory RPC is SECURITY DEFINER',
    p.prosecdef
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.get_student_teacher_directory(text)')

  UNION ALL
  SELECT
    'student teacher-directory RPC has empty search_path',
    EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg IN ('search_path=""','search_path=')
    )
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.get_student_teacher_directory(text)')

  UNION ALL
  SELECT
    'student teacher-directory RPC anon EXECUTE allowed',
    has_function_privilege(
      'anon',
      'public.get_student_teacher_directory(text)',
      'EXECUTE'
    )

  UNION ALL
  SELECT
    'teachers_directory anon direct SELECT blocked',
    NOT has_table_privilege('anon','public.teachers_directory','SELECT')

  UNION ALL
  SELECT
    'audit_logs RLS enabled',
    c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='audit_logs'

  UNION ALL
  SELECT
    'audit_logs anon SELECT blocked',
    NOT has_table_privilege('anon','public.audit_logs','SELECT')

  UNION ALL
  SELECT
    'audit_logs anon INSERT blocked',
    NOT has_table_privilege('anon','public.audit_logs','INSERT')

  UNION ALL
  SELECT
    'audit_logs authenticated UPDATE/DELETE blocked',
    NOT has_table_privilege('authenticated','public.audit_logs','UPDATE,DELETE')

  UNION ALL
  SELECT
    'audit_logs authenticated SELECT/INSERT grants retained',
    has_table_privilege('authenticated','public.audit_logs','SELECT')
    AND has_table_privilege('authenticated','public.audit_logs','INSERT')

  UNION ALL
  SELECT
    'audit_logs exactly two trusted-admin policies',
    COUNT(*) = 2
    AND bool_and(array_to_string(roles,',')='authenticated')
    AND bool_and(
      COALESCE(qual,'') LIKE '%is_admin%'
      OR COALESCE(with_check,'') LIKE '%is_admin%'
    )
  FROM pg_policies
  WHERE schemaname='public' AND tablename='audit_logs'

  UNION ALL
  SELECT
    'service_role teachers CRUD preserved',
    has_table_privilege('service_role','public.teachers','SELECT,INSERT,UPDATE,DELETE')

  UNION ALL
  SELECT
    'service_role audit_logs CRUD preserved',
    has_table_privilege('service_role','public.audit_logs','SELECT,INSERT,UPDATE,DELETE')
)
SELECT
  check_name,
  passed,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END result
FROM checks
ORDER BY check_name;

WITH checks(passed) AS (
  SELECT NOT has_table_privilege('anon','public.teachers','SELECT,INSERT,UPDATE,DELETE')
  UNION ALL
  SELECT has_function_privilege('anon','public.get_student_teacher_directory(text)','EXECUTE')
  UNION ALL
  SELECT NOT has_table_privilege('anon','public.teachers_directory','SELECT')
  UNION ALL
  SELECT NOT has_table_privilege('anon','public.audit_logs','SELECT,INSERT,UPDATE,DELETE')
  UNION ALL
  SELECT NOT has_table_privilege('authenticated','public.audit_logs','UPDATE,DELETE')
  UNION ALL
  SELECT has_table_privilege('service_role','public.teachers','SELECT,INSERT,UPDATE,DELETE')
  UNION ALL
  SELECT has_table_privilege('service_role','public.audit_logs','SELECT,INSERT,UPDATE,DELETE')
)
SELECT
  COUNT(*) total_checks,
  COUNT(*) FILTER (WHERE passed) passed_checks,
  COUNT(*) FILTER (WHERE NOT passed) failed_checks,
  bool_and(passed) all_checks_pass
FROM checks;
