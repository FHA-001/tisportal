-- ============================================================
-- VERIFY BATCH 4 REGRESSION FIX — READ ONLY
-- ============================================================

WITH checks(check_name, passed) AS (
  SELECT
    'get_teacher_class_subjects exists',
    to_regprocedure('public.get_teacher_class_subjects(text)') IS NOT NULL

  UNION ALL
  SELECT
    'get_teacher_class_subjects SECURITY DEFINER',
    p.prosecdef
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.get_teacher_class_subjects(text)')

  UNION ALL
  SELECT
    'get_teacher_class_subjects empty search_path',
    EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg IN ('search_path=""','search_path=')
    )
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.get_teacher_class_subjects(text)')

  UNION ALL
  SELECT
    'anon can execute get_teacher_class_subjects',
    has_function_privilege('anon','public.get_teacher_class_subjects(text)','EXECUTE')

  UNION ALL
  SELECT
    'get_teacher_classes exists',
    to_regprocedure('public.get_teacher_classes(text)') IS NOT NULL

  UNION ALL
  SELECT
    'get_teacher_classes SECURITY DEFINER',
    p.prosecdef
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.get_teacher_classes(text)')

  UNION ALL
  SELECT
    'get_teacher_classes empty search_path',
    EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg IN ('search_path=""','search_path=')
    )
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.get_teacher_classes(text)')

  UNION ALL
  SELECT
    'anon can execute get_teacher_classes',
    has_function_privilege('anon','public.get_teacher_classes(text)','EXECUTE')

  UNION ALL
  SELECT
    'teachers direct anon SELECT still blocked',
    NOT has_table_privilege('anon','public.teachers','SELECT')

  UNION ALL
  SELECT
    'teachers_directory direct anon SELECT still blocked',
    NOT has_table_privilege('anon','public.teachers_directory','SELECT')
)
SELECT
  check_name,
  passed,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_name;

WITH checks(passed) AS (
  SELECT to_regprocedure('public.get_teacher_class_subjects(text)') IS NOT NULL
  UNION ALL SELECT has_function_privilege('anon','public.get_teacher_class_subjects(text)','EXECUTE')
  UNION ALL SELECT to_regprocedure('public.get_teacher_classes(text)') IS NOT NULL
  UNION ALL SELECT has_function_privilege('anon','public.get_teacher_classes(text)','EXECUTE')
  UNION ALL SELECT NOT has_table_privilege('anon','public.teachers','SELECT')
  UNION ALL SELECT NOT has_table_privilege('anon','public.teachers_directory','SELECT')
)
SELECT
  COUNT(*) total_checks,
  COUNT(*) FILTER (WHERE passed) passed_checks,
  COUNT(*) FILTER (WHERE NOT passed) failed_checks,
  bool_and(passed) all_checks_pass
FROM checks;
