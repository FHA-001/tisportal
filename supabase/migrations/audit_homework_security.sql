-- ============================================================
-- HOMEWORK SECURITY — LIVE READ-ONLY AUDIT (SAFE VERSION)
-- ============================================================
-- READ-ONLY: SELECT/catalog inspection only.

WITH
homework_table AS (
  SELECT c.oid, c.relowner, c.relacl, c.relrowsecurity, c.relforcerowsecurity
  FROM pg_class AS c
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'homework'
    AND c.relkind IN ('r','p')
),
homework_columns AS (
  SELECT ordinal_position, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'homework'
),
homework_policies AS (
  SELECT policyname, cmd, roles, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'homework'
),
dependent_views AS (
  SELECT DISTINCT
    dep_ns.nspname AS schema_name,
    dep_rel.relname AS object_name,
    CASE dep_rel.relkind
      WHEN 'v' THEN 'view'
      WHEN 'm' THEN 'materialized view'
      ELSE dep_rel.relkind::text
    END AS object_type
  FROM homework_table AS ht
  JOIN pg_depend AS d ON d.refobjid = ht.oid
  JOIN pg_rewrite AS rw ON rw.oid = d.objid
  JOIN pg_class AS dep_rel ON dep_rel.oid = rw.ev_class
  JOIN pg_namespace AS dep_ns ON dep_ns.oid = dep_rel.relnamespace
  WHERE dep_rel.oid <> ht.oid
    AND dep_rel.relkind IN ('v','m')
),
homework_functions AS (
  SELECT
    p.oid,
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_arguments(p.oid) AS display_arguments,
    p.prosecdef,
    p.proconfig,
    p.proowner,
    p.prosrc
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND lower(p.prosrc) LIKE '%homework%'
),
get_student_class_proc AS (
  SELECT
    p.oid,
    n.nspname AS schema_name,
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_arguments(p.oid) AS display_arguments,
    p.prosecdef,
    p.proconfig,
    p.proowner,
    p.prosrc
  FROM pg_proc AS p
  JOIN pg_namespace AS n ON n.oid = p.pronamespace
  WHERE p.oid = to_regprocedure('public.get_student_class(uuid)')
),
audit_rows AS (
  SELECT
    10 AS sort_order,
    'HOMEWORK COLUMN'::text AS section,
    hc.column_name::text AS item,
    hc.data_type::text AS role_or_command,
    'nullable=' || hc.is_nullable::text AS detail_1,
    'default=' || COALESCE(hc.column_default, '<none>') AS detail_2
  FROM homework_columns AS hc

  UNION ALL

  SELECT
    20,'RLS STATUS','public.homework',NULL,
    CASE WHEN ht.relrowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END,
    CASE WHEN ht.relforcerowsecurity THEN 'FORCE RLS ENABLED' ELSE 'FORCE RLS DISABLED' END
  FROM homework_table AS ht

  UNION ALL

  SELECT
    30,'RLS POLICY',hp.policyname,hp.cmd,
    'roles=' || COALESCE(array_to_string(hp.roles, ','), '<none>') ||
    '; using=' || COALESCE(hp.qual, '<none>'),
    'with_check=' || COALESCE(hp.with_check, '<none>')
  FROM homework_policies AS hp

  UNION ALL

  SELECT
    40,'TABLE PRIVILEGE',v.role_name,v.privilege_name,
    CASE WHEN has_table_privilege(v.role_name, 'public.homework', v.privilege_name) THEN 'YES' ELSE 'NO' END,
    NULL
  FROM (
    VALUES
      ('anon'::text,'SELECT'::text),('anon','INSERT'),('anon','UPDATE'),('anon','DELETE'),
      ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','UPDATE'),('authenticated','DELETE'),
      ('service_role','SELECT'),('service_role','INSERT'),('service_role','UPDATE'),('service_role','DELETE')
  ) AS v(role_name, privilege_name)

  UNION ALL

  SELECT
    50,'COLUMN PRIVILEGE SUMMARY',v.role_name,v.privilege_name,
    CASE WHEN has_any_column_privilege(v.role_name, 'public.homework', v.privilege_name) THEN 'YES' ELSE 'NO' END,
    NULL
  FROM (
    VALUES
      ('anon'::text,'SELECT'::text),('anon','INSERT'),('anon','UPDATE'),('anon','REFERENCES'),
      ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','UPDATE'),('authenticated','REFERENCES'),
      ('service_role','SELECT'),('service_role','INSERT'),('service_role','UPDATE'),('service_role','REFERENCES')
  ) AS v(role_name, privilege_name)

  UNION ALL

  SELECT
    60,'TABLE OWNER','public.homework',pg_get_userbyid(ht.relowner),
    'owner_oid=' || ht.relowner::text,NULL
  FROM homework_table AS ht

  UNION ALL

  SELECT
    70,'DEPENDENT VIEW',dv.schema_name || '.' || dv.object_name,dv.object_type,
    'depends on public.homework',NULL
  FROM dependent_views AS dv

  UNION ALL

  SELECT
    80,'HOMEWORK FUNCTION',
    hf.schema_name || '.' || hf.function_name || '(' || hf.identity_arguments || ')',
    CASE WHEN hf.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
    'search_path=' || COALESCE(array_to_string(hf.proconfig, ','), '<not explicitly set>'),
    'display_args=' || hf.display_arguments
  FROM homework_functions AS hf

  UNION ALL

  SELECT
    90,'HOMEWORK FUNCTION EXECUTE',
    hf.function_name || '(' || hf.identity_arguments || ')',
    r.role_name,
    CASE WHEN has_function_privilege(r.role_name, hf.oid, 'EXECUTE') THEN 'YES' ELSE 'NO' END,
    CASE WHEN hf.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END
  FROM homework_functions AS hf
  CROSS JOIN (
    VALUES ('anon'::text),('authenticated'::text),('service_role'::text)
  ) AS r(role_name)

  UNION ALL

  SELECT
    100,'GET_STUDENT_CLASS',
    'public.get_student_class(' || g.identity_arguments || ')',
    CASE WHEN g.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
    'search_path=' || COALESCE(array_to_string(g.proconfig, ','), '<not explicitly set>'),
    'display_args=' || g.display_arguments
  FROM get_student_class_proc AS g

  UNION ALL

  SELECT
    110,'GET_STUDENT_CLASS EXECUTE',
    'public.get_student_class(' || g.identity_arguments || ')',
    r.role_name,
    CASE WHEN has_function_privilege(r.role_name, g.oid, 'EXECUTE') THEN 'YES' ELSE 'NO' END,
    NULL
  FROM get_student_class_proc AS g
  CROSS JOIN (
    VALUES ('anon'::text),('authenticated'::text),('service_role'::text)
  ) AS r(role_name)

  UNION ALL

  SELECT
    120,'GET_STUDENT_CLASS SAFETY','caller-supplied student id',NULL,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM get_student_class_proc AS g
        WHERE lower(g.prosrc) LIKE '%p_student_id%'
      )
      THEN 'YES - function source references p_student_id'
      ELSE 'NO - p_student_id not detected'
    END,
    NULL

  UNION ALL

  SELECT
    121,'GET_STUDENT_CLASS SAFETY','custom session validation',NULL,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM get_student_class_proc AS g
        WHERE lower(g.prosrc) LIKE '%validate_custom_session%'
      )
      THEN 'YES - validate_custom_session detected'
      ELSE 'NO - validate_custom_session not detected'
    END,
    NULL
)
SELECT section,item,role_or_command,detail_1,detail_2
FROM audit_rows
ORDER BY sort_order, section, item, role_or_command NULLS FIRST;
