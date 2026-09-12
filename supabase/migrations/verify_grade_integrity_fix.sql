-- ============================================================
-- STRUCTURAL VERIFICATION FOR GRADE INTEGRITY FIX
-- ============================================================
-- READ-ONLY verification for:
-- supabase/migrations/20240828_fix_grade_duplicates_and_integrity.sql

WITH
function_oids AS (
  SELECT
    to_regprocedure('public.save_teacher_grades(text,jsonb)')::oid AS save_oid,
    to_regprocedure('public.get_teacher_grades(text,uuid,text,text)')::oid AS get_oid
),
save_proc AS (
  SELECT p.*
  FROM pg_proc AS p
  CROSS JOIN function_oids AS f
  WHERE f.save_oid IS NOT NULL
    AND p.oid = f.save_oid
),
get_proc AS (
  SELECT p.*
  FROM pg_proc AS p
  CROSS JOIN function_oids AS f
  WHERE f.get_oid IS NOT NULL
    AND p.oid = f.get_oid
),
save_source AS (
  SELECT lower(regexp_replace(p.prosrc, '[[:space:]]+', ' ', 'g')) AS src
  FROM save_proc AS p
),
get_source AS (
  SELECT lower(regexp_replace(p.prosrc, '[[:space:]]+', ' ', 'g')) AS src
  FROM get_proc AS p
),
constraint_meta AS (
  SELECT
    c.oid AS constraint_oid,
    c.conindid,
    array_agg(a.attname::text ORDER BY key_col.ord) AS columns_in_order,
    i.indnullsnotdistinct
  FROM pg_constraint AS c
  JOIN pg_namespace AS n ON n.oid = c.connamespace
  JOIN pg_class AS tbl ON tbl.oid = c.conrelid
  CROSS JOIN LATERAL unnest(c.conkey)
    WITH ORDINALITY AS key_col(attnum, ord)
  JOIN pg_attribute AS a
    ON a.attrelid = tbl.oid
   AND a.attnum = key_col.attnum
  LEFT JOIN pg_index AS i
    ON i.indexrelid = c.conindid
  WHERE n.nspname = 'public'
    AND tbl.relname = 'grades'
    AND c.conname = 'grades_logical_identity_unique'
    AND c.contype = 'u'
  GROUP BY c.oid, c.conindid, i.indnullsnotdistinct
),
checks AS (
  SELECT
    1 AS check_order,
    'No duplicate logical grades'::text AS check_name,
    NOT EXISTS (
      SELECT 1
      FROM public.grades AS g
      GROUP BY g.student_id, g.class_subject_id, g.term, g.session
      HAVING count(*) > 1
    ) AS passed,
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM public.grades AS g
        GROUP BY g.student_id, g.class_subject_id, g.term, g.session
        HAVING count(*) > 1
      )
      THEN 'PASS - No duplicate logical grade identities'
      ELSE 'FAIL - Duplicate logical grade identities found'
    END::text AS details

  UNION ALL

  SELECT
    2,
    'Unique constraint exists',
    EXISTS (SELECT 1 FROM constraint_meta),
    CASE
      WHEN EXISTS (SELECT 1 FROM constraint_meta)
      THEN 'PASS - grades_logical_identity_unique exists on public.grades'
      ELSE 'FAIL - grades_logical_identity_unique is missing'
    END

  UNION ALL

  SELECT
    3,
    'Constraint columns correct',
    COALESCE(
      (SELECT cm.columns_in_order =
        ARRAY['student_id','class_subject_id','term','session']::text[]
       FROM constraint_meta AS cm),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT cm.columns_in_order =
          ARRAY['student_id','class_subject_id','term','session']::text[]
         FROM constraint_meta AS cm),
        false
      )
      THEN 'PASS - Constraint columns are student_id, class_subject_id, term, session in the expected order'
      WHEN EXISTS (SELECT 1 FROM constraint_meta)
      THEN (
        SELECT 'FAIL - Constraint columns are: ' ||
          array_to_string(cm.columns_in_order, ', ')
        FROM constraint_meta AS cm
      )
      ELSE 'FAIL - Constraint metadata unavailable because the constraint is missing'
    END

  UNION ALL

  SELECT
    4,
    'NULLS NOT DISTINCT enabled',
    COALESCE(
      (SELECT cm.indnullsnotdistinct IS TRUE FROM constraint_meta AS cm),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT cm.indnullsnotdistinct IS TRUE FROM constraint_meta AS cm),
        false
      )
      THEN 'PASS - NULLS NOT DISTINCT is enabled on the constraint backing index'
      ELSE 'FAIL - NULLS NOT DISTINCT is not enabled or could not be verified'
    END

  UNION ALL

  SELECT
    5,
    'save_teacher_grades exists',
    (SELECT save_oid IS NOT NULL FROM function_oids),
    CASE
      WHEN (SELECT save_oid IS NOT NULL FROM function_oids)
      THEN 'PASS - public.save_teacher_grades(text,jsonb) exists'
      ELSE 'FAIL - public.save_teacher_grades(text,jsonb) is missing'
    END

  UNION ALL

  SELECT
    6,
    'SECURITY DEFINER configured',
    COALESCE((SELECT p.prosecdef FROM save_proc AS p), false),
    CASE
      WHEN COALESCE((SELECT p.prosecdef FROM save_proc AS p), false)
      THEN 'PASS - save_teacher_grades is SECURITY DEFINER'
      ELSE 'FAIL - save_teacher_grades is not SECURITY DEFINER'
    END

  UNION ALL

  SELECT
    7,
    'Empty search_path configured',
    EXISTS (
      SELECT 1
      FROM save_proc AS p
      CROSS JOIN LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg(config_item)
      WHERE cfg.config_item ~ '^search_path=(""|''''|)$'
    ),
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM save_proc AS p
        CROSS JOIN LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg(config_item)
        WHERE cfg.config_item ~ '^search_path=(""|''''|)$'
      )
      THEN 'PASS - save_teacher_grades has an explicitly empty search_path'
      ELSE 'FAIL - Explicitly empty search_path not found in pg_proc.proconfig'
    END

  UNION ALL

  SELECT
    8,
    'Anon execute allowed',
    COALESCE(
      has_function_privilege('anon', (SELECT save_oid FROM function_oids), 'EXECUTE'),
      false
    ),
    CASE
      WHEN COALESCE(
        has_function_privilege('anon', (SELECT save_oid FROM function_oids), 'EXECUTE'),
        false
      )
      THEN 'PASS - anon has EXECUTE on save_teacher_grades'
      ELSE 'FAIL - anon does not have EXECUTE on save_teacher_grades'
    END

  UNION ALL

  SELECT
    9,
    'Authenticated execute blocked',
    CASE
      WHEN (SELECT save_oid FROM function_oids) IS NULL THEN false
      ELSE NOT COALESCE(
        has_function_privilege('authenticated', (SELECT save_oid FROM function_oids), 'EXECUTE'),
        false
      )
    END,
    CASE
      WHEN (SELECT save_oid FROM function_oids) IS NULL
      THEN 'FAIL - save_teacher_grades is missing'
      WHEN NOT COALESCE(
        has_function_privilege('authenticated', (SELECT save_oid FROM function_oids), 'EXECUTE'),
        false
      )
      THEN 'PASS - authenticated EXECUTE is blocked'
      ELSE 'FAIL - authenticated still has EXECUTE'
    END

  UNION ALL

  SELECT
    10,
    'Public execute blocked',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM save_proc) THEN false
      ELSE NOT EXISTS (
        SELECT 1
        FROM save_proc AS p
        CROSS JOIN LATERAL aclexplode(
          COALESCE(p.proacl, acldefault('f', p.proowner))
        ) AS acl(grantor, grantee, privilege_type, is_grantable)
        WHERE acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM save_proc)
      THEN 'FAIL - save_teacher_grades is missing'
      WHEN NOT EXISTS (
        SELECT 1
        FROM save_proc AS p
        CROSS JOIN LATERAL aclexplode(
          COALESCE(p.proacl, acldefault('f', p.proowner))
        ) AS acl(grantor, grantee, privilege_type, is_grantable)
        WHERE acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      THEN 'PASS - PUBLIC EXECUTE is blocked'
      ELSE 'FAIL - PUBLIC still has EXECUTE'
    END

  UNION ALL

  SELECT
    11,
    'Teacher session validation',
    COALESCE(
      (SELECT s.src LIKE '%validate_custom_session%' AND s.src LIKE '%''teacher''%' FROM save_source AS s),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT s.src LIKE '%validate_custom_session%' AND s.src LIKE '%''teacher''%' FROM save_source AS s),
        false
      )
      THEN 'PASS - Teacher custom-session validation is present'
      ELSE 'FAIL - Teacher custom-session validation was not detected'
    END

  UNION ALL

  SELECT
    12,
    'Assignment ownership validation',
    COALESCE(
      (SELECT s.src LIKE '%class_subjects%' AND s.src LIKE '%teacher_id%' AND s.src LIKE '%v_teacher_id%' FROM save_source AS s),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT s.src LIKE '%class_subjects%' AND s.src LIKE '%teacher_id%' AND s.src LIKE '%v_teacher_id%' FROM save_source AS s),
        false
      )
      THEN 'PASS - Teacher assignment ownership validation is present'
      ELSE 'FAIL - Teacher assignment ownership validation was not detected'
    END

  UNION ALL

  SELECT
    13,
    'Student class validation',
    COALESCE(
      (SELECT s.src LIKE '%students%' AND s.src LIKE '%class_id%' AND s.src LIKE '%v_student_class_id%' AND s.src LIKE '%v_class_id%' FROM save_source AS s),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT s.src LIKE '%students%' AND s.src LIKE '%class_id%' AND s.src LIKE '%v_student_class_id%' AND s.src LIKE '%v_class_id%' FROM save_source AS s),
        false
      )
      THEN 'PASS - Student class-membership validation is present'
      ELSE 'FAIL - Student class-membership validation was not detected'
    END

  UNION ALL

  SELECT
    14,
    'Immutable identity checks',
    COALESCE(
      (SELECT s.src LIKE '%cannot change student_id%' AND s.src LIKE '%cannot change class_subject_id%' FROM save_source AS s),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT s.src LIKE '%cannot change student_id%' AND s.src LIKE '%cannot change class_subject_id%' FROM save_source AS s),
        false
      )
      THEN 'PASS - Existing grade student_id and class_subject_id are protected'
      ELSE 'FAIL - Immutable identity checks were not detected'
    END

  UNION ALL

  SELECT
    15,
    'ON CONFLICT duplicate prevention',
    COALESCE((SELECT s.src LIKE '%on conflict%' FROM save_source AS s), false),
    CASE
      WHEN COALESCE((SELECT s.src LIKE '%on conflict%' FROM save_source AS s), false)
      THEN 'PASS - ON CONFLICT duplicate prevention is present'
      ELSE 'FAIL - ON CONFLICT duplicate prevention was not detected'
    END

  UNION ALL

  SELECT
    16,
    'Conflict fields correct',
    COALESCE(
      (SELECT s.src LIKE '%on conflict (student_id, class_subject_id, term, session)%' FROM save_source AS s),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT s.src LIKE '%on conflict (student_id, class_subject_id, term, session)%' FROM save_source AS s),
        false
      )
      THEN 'PASS - ON CONFLICT uses student_id, class_subject_id, term, session'
      ELSE 'FAIL - ON CONFLICT does not use the expected logical identity'
    END

  UNION ALL

  SELECT
    17,
    'get_teacher_grades exists',
    (SELECT get_oid IS NOT NULL FROM function_oids),
    CASE
      WHEN (SELECT get_oid IS NOT NULL FROM function_oids)
      THEN 'PASS - public.get_teacher_grades(text,uuid,text,text) exists'
      ELSE 'FAIL - public.get_teacher_grades(text,uuid,text,text) is missing'
    END

  UNION ALL

  SELECT
    18,
    'B6A-2 ambiguity fix (get_teacher_grades)',
    COALESCE(
      (SELECT g.src LIKE '%cs.id = p_class_subject_id%' AND g.src LIKE '%cs.teacher_id = v_teacher_id%' FROM get_source AS g),
      false
    ),
    CASE
      WHEN COALESCE(
        (SELECT g.src LIKE '%cs.id = p_class_subject_id%' AND g.src LIKE '%cs.teacher_id = v_teacher_id%' FROM get_source AS g),
        false
      )
      THEN 'PASS - Qualified get_teacher_grades assignment lookup is preserved'
      ELSE 'FAIL - Qualified get_teacher_grades assignment lookup was not detected'
    END
),
final_results AS (
  SELECT c.check_order, c.check_name, c.passed, c.details
  FROM checks AS c

  UNION ALL

  SELECT
    99,
    'ALL CHECKS PASS',
    (count(*) = 18 AND bool_and(passed)),
    CASE
      WHEN count(*) = 18 AND bool_and(passed)
      THEN 'PASS - All 18 grade-integrity verification checks passed'
      ELSE
        'FAIL - ' ||
        count(*) FILTER (WHERE passed) ||
        ' of ' ||
        count(*) ||
        ' verification checks passed'
    END
  FROM checks
)
SELECT check_name, passed, details
FROM final_results
ORDER BY check_order;
