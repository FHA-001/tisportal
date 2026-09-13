-- ============================================================
-- HOMEWORK SECURITY — STRUCTURAL VERIFICATION
-- ============================================================
-- READ-ONLY verification after secure Homework migration.
--
-- Expected final row:
-- ALL CHECKS PASS | true

WITH
function_oids AS (
  SELECT
    to_regprocedure('public.get_teacher_homework(text)')::oid AS teacher_get_oid,
    to_regprocedure('public.create_teacher_homework(text,jsonb)')::oid AS teacher_create_oid,
    to_regprocedure('public.update_teacher_homework(text,uuid,jsonb)')::oid AS teacher_update_oid,
    to_regprocedure('public.delete_teacher_homework(text,uuid)')::oid AS teacher_delete_oid,
    to_regprocedure('public.get_student_homework(text)')::oid AS student_get_oid,
    to_regprocedure('public.get_student_class(uuid)')::oid AS old_student_class_oid
),
checks AS (
  SELECT
    1 AS check_order,
    'Homework RLS enabled'::text AS check_name,
    COALESCE((
      SELECT c.relrowsecurity
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname='public'
        AND c.relname='homework'
        AND c.relkind IN ('r','p')
    ), false) AS passed,
    'public.homework must have RLS enabled'::text AS details

  UNION ALL

  SELECT
    2,
    'No Homework RLS policies remain',
    NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname='public' AND tablename='homework'
    ),
    'Homework access should be RPC-only'

  UNION ALL

  SELECT
    3,
    'anon direct Homework access revoked',
    NOT has_table_privilege('anon','public.homework','SELECT')
      AND NOT has_table_privilege('anon','public.homework','INSERT')
      AND NOT has_table_privilege('anon','public.homework','UPDATE')
      AND NOT has_table_privilege('anon','public.homework','DELETE'),
    'anon must not directly access public.homework'

  UNION ALL

  SELECT
    4,
    'authenticated direct Homework access revoked',
    NOT has_table_privilege('authenticated','public.homework','SELECT')
      AND NOT has_table_privilege('authenticated','public.homework','INSERT')
      AND NOT has_table_privilege('authenticated','public.homework','UPDATE')
      AND NOT has_table_privilege('authenticated','public.homework','DELETE'),
    'authenticated must not directly access public.homework'

  UNION ALL

  SELECT
    5,
    'anon Homework column privileges revoked',
    NOT has_any_column_privilege('anon','public.homework','SELECT')
      AND NOT has_any_column_privilege('anon','public.homework','INSERT')
      AND NOT has_any_column_privilege('anon','public.homework','UPDATE')
      AND NOT has_any_column_privilege('anon','public.homework','REFERENCES'),
    'No anon column privilege should bypass table lockdown'

  UNION ALL

  SELECT
    6,
    'authenticated Homework column privileges revoked',
    NOT has_any_column_privilege('authenticated','public.homework','SELECT')
      AND NOT has_any_column_privilege('authenticated','public.homework','INSERT')
      AND NOT has_any_column_privilege('authenticated','public.homework','UPDATE')
      AND NOT has_any_column_privilege('authenticated','public.homework','REFERENCES'),
    'No authenticated column privilege should bypass table lockdown'

  UNION ALL

  SELECT
    7,
    'service_role Homework access preserved',
    has_table_privilege('service_role','public.homework','SELECT')
      AND has_table_privilege('service_role','public.homework','INSERT')
      AND has_table_privilege('service_role','public.homework','UPDATE')
      AND has_table_privilege('service_role','public.homework','DELETE'),
    'service_role direct access must remain'

  UNION ALL

  SELECT
    8,
    'Teacher read RPC exists',
    (SELECT teacher_get_oid IS NOT NULL FROM function_oids),
    'public.get_teacher_homework(text)'

  UNION ALL

  SELECT
    9,
    'Teacher create RPC exists',
    (SELECT teacher_create_oid IS NOT NULL FROM function_oids),
    'public.create_teacher_homework(text,jsonb)'

  UNION ALL

  SELECT
    10,
    'Teacher update RPC exists',
    (SELECT teacher_update_oid IS NOT NULL FROM function_oids),
    'public.update_teacher_homework(text,uuid,jsonb)'

  UNION ALL

  SELECT
    11,
    'Teacher delete RPC exists',
    (SELECT teacher_delete_oid IS NOT NULL FROM function_oids),
    'public.delete_teacher_homework(text,uuid)'

  UNION ALL

  SELECT
    12,
    'Student read RPC exists',
    (SELECT student_get_oid IS NOT NULL FROM function_oids),
    'public.get_student_homework(text)'

  UNION ALL

  SELECT
    13,
    'All new Homework RPCs are SECURITY DEFINER',
    NOT EXISTS (
      SELECT 1
      FROM pg_proc AS p
      WHERE p.oid IN (
        (SELECT teacher_get_oid FROM function_oids),
        (SELECT teacher_create_oid FROM function_oids),
        (SELECT teacher_update_oid FROM function_oids),
        (SELECT teacher_delete_oid FROM function_oids),
        (SELECT student_get_oid FROM function_oids)
      )
      AND p.prosecdef IS NOT TRUE
    )
    AND (
      SELECT teacher_get_oid IS NOT NULL
         AND teacher_create_oid IS NOT NULL
         AND teacher_update_oid IS NOT NULL
         AND teacher_delete_oid IS NOT NULL
         AND student_get_oid IS NOT NULL
      FROM function_oids
    ),
    'Every client-facing Homework RPC must be SECURITY DEFINER'

  UNION ALL

  SELECT
    14,
    'All new Homework RPCs use empty search_path',
    NOT EXISTS (
      SELECT 1
      FROM pg_proc AS p
      WHERE p.oid IN (
        (SELECT teacher_get_oid FROM function_oids),
        (SELECT teacher_create_oid FROM function_oids),
        (SELECT teacher_update_oid FROM function_oids),
        (SELECT teacher_delete_oid FROM function_oids),
        (SELECT student_get_oid FROM function_oids)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg(config_item)
        WHERE cfg.config_item ~ '^search_path=(""|''''|)$'
      )
    ),
    'Every client-facing Homework RPC must explicitly use an empty search_path'

  UNION ALL

  SELECT
    15,
    'anon can execute all new Homework RPCs',
    COALESCE(has_function_privilege('anon',(SELECT teacher_get_oid FROM function_oids),'EXECUTE'),false)
      AND COALESCE(has_function_privilege('anon',(SELECT teacher_create_oid FROM function_oids),'EXECUTE'),false)
      AND COALESCE(has_function_privilege('anon',(SELECT teacher_update_oid FROM function_oids),'EXECUTE'),false)
      AND COALESCE(has_function_privilege('anon',(SELECT teacher_delete_oid FROM function_oids),'EXECUTE'),false)
      AND COALESCE(has_function_privilege('anon',(SELECT student_get_oid FROM function_oids),'EXECUTE'),false),
    'Custom-session browser clients use anon to call RPCs'

  UNION ALL

  SELECT
    16,
    'authenticated cannot execute new Homework RPCs',
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM function_oids
        WHERE teacher_get_oid IS NULL
           OR teacher_create_oid IS NULL
           OR teacher_update_oid IS NULL
           OR teacher_delete_oid IS NULL
           OR student_get_oid IS NULL
      ) THEN false
      ELSE
        NOT has_function_privilege('authenticated',(SELECT teacher_get_oid FROM function_oids),'EXECUTE')
        AND NOT has_function_privilege('authenticated',(SELECT teacher_create_oid FROM function_oids),'EXECUTE')
        AND NOT has_function_privilege('authenticated',(SELECT teacher_update_oid FROM function_oids),'EXECUTE')
        AND NOT has_function_privilege('authenticated',(SELECT teacher_delete_oid FROM function_oids),'EXECUTE')
        AND NOT has_function_privilege('authenticated',(SELECT student_get_oid FROM function_oids),'EXECUTE')
    END,
    'authenticated must not bypass the custom-session RPC model'

  UNION ALL

  SELECT
    17,
    'Unsafe get_student_class blocked for anon',
    CASE
      WHEN (SELECT old_student_class_oid FROM function_oids) IS NULL THEN true
      ELSE NOT has_function_privilege(
        'anon',
        (SELECT old_student_class_oid FROM function_oids),
        'EXECUTE'
      )
    END,
    'anon must not execute get_student_class(uuid)'

  UNION ALL

  SELECT
    18,
    'Unsafe get_student_class blocked for authenticated',
    CASE
      WHEN (SELECT old_student_class_oid FROM function_oids) IS NULL THEN true
      ELSE NOT has_function_privilege(
        'authenticated',
        (SELECT old_student_class_oid FROM function_oids),
        'EXECUTE'
      )
    END,
    'authenticated must not execute get_student_class(uuid)'

  UNION ALL

  SELECT
    19,
    'Teacher RPCs validate custom teacher sessions',
    (
      SELECT count(*) = 4
      FROM pg_proc AS p
      WHERE p.oid IN (
        (SELECT teacher_get_oid FROM function_oids),
        (SELECT teacher_create_oid FROM function_oids),
        (SELECT teacher_update_oid FROM function_oids),
        (SELECT teacher_delete_oid FROM function_oids)
      )
        AND lower(p.prosrc) LIKE '%validate_custom_session%'
        AND lower(p.prosrc) LIKE '%''teacher''%'
    ),
    'All four Teacher RPCs must derive Teacher identity server-side'

  UNION ALL

  SELECT
    20,
    'Teacher write RPCs validate class/subject assignment',
    (
      SELECT count(*) = 2
      FROM pg_proc AS p
      WHERE p.oid IN (
        (SELECT teacher_create_oid FROM function_oids),
        (SELECT teacher_update_oid FROM function_oids)
      )
        AND lower(p.prosrc) LIKE '%class_subjects%'
        AND lower(p.prosrc) LIKE '%teacher_id%'
        AND lower(p.prosrc) LIKE '%class_id%'
        AND lower(p.prosrc) LIKE '%subject_id%'
    ),
    'Teacher create/update must verify assignment server-side'

  UNION ALL

  SELECT
    21,
    'Student RPC validates custom student session',
    COALESCE((
      SELECT
        lower(p.prosrc) LIKE '%validate_custom_session%'
        AND lower(p.prosrc) LIKE '%''student''%'
        AND lower(p.prosrc) LIKE '%students%'
        AND lower(p.prosrc) LIKE '%class_id%'
      FROM pg_proc AS p
      WHERE p.oid = (SELECT student_get_oid FROM function_oids)
    ), false),
    'Student class must be derived from the session Student'
),
final_results AS (
  SELECT check_order, check_name, passed, details
  FROM checks

  UNION ALL

  SELECT
    99,
    'ALL CHECKS PASS',
    (count(*) = 21 AND bool_and(passed)),
    CASE
      WHEN count(*) = 21 AND bool_and(passed)
      THEN 'PASS - All 21 Homework security checks passed'
      ELSE 'FAIL - ' || count(*) FILTER (WHERE passed) || ' of ' || count(*) || ' checks passed'
    END
  FROM checks
)
SELECT check_name, passed, details
FROM final_results
ORDER BY check_order;

