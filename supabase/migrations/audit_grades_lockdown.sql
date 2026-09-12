-- ============================================================
-- B6A-3 GRADES TABLE LOCKDOWN — LIVE READ-ONLY AUDIT (SAFE VERSION)
-- ============================================================
-- Purpose:
--   Inspect the actual live security state of public.grades before
--   creating the B6A-3 lockdown migration.
--
-- READ-ONLY ONLY:
--   SELECT/catalog inspection only.
--
-- This version intentionally avoids aclexplode(), because some Supabase
-- catalog ACL arrays can trigger "ACL arrays must be one-dimensional".
--
-- Output columns:
--   section | item | role_or_command | detail_1 | detail_2

WITH
grades_table AS (
  SELECT
    c.oid,
    c.relowner,
    c.relacl,
    c.relrowsecurity,
    c.relforcerowsecurity
  FROM pg_class AS c
  JOIN pg_namespace AS n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'grades'
    AND c.relkind IN ('r','p')
),

policy_rows AS (
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

grade_functions AS (
  SELECT
    p.oid,
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_arguments(p.oid) AS display_arguments,
    p.prosecdef,
    p.proconfig,
    p.proacl,
    p.proowner,
    p.prosrc
  FROM pg_proc AS p
  JOIN pg_namespace AS n
    ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND lower(p.prosrc) LIKE '%grades%'
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
  FROM grades_table AS gt
  JOIN pg_depend AS d
    ON d.refobjid = gt.oid
  JOIN pg_rewrite AS rw
    ON rw.oid = d.objid
  JOIN pg_class AS dep_rel
    ON dep_rel.oid = rw.ev_class
  JOIN pg_namespace AS dep_ns
    ON dep_ns.oid = dep_rel.relnamespace
  WHERE dep_rel.oid <> gt.oid
    AND dep_rel.relkind IN ('v','m')
),

audit_rows AS (

  -- 1. RLS state
  SELECT
    10 AS sort_order,
    'RLS STATUS'::text AS section,
    'public.grades'::text AS item,
    NULL::text AS role_or_command,
    CASE WHEN gt.relrowsecurity THEN 'RLS ENABLED' ELSE 'RLS DISABLED' END::text AS detail_1,
    CASE WHEN gt.relforcerowsecurity THEN 'FORCE RLS ENABLED' ELSE 'FORCE RLS DISABLED' END::text AS detail_2
  FROM grades_table AS gt

  UNION ALL

  -- 2. Policies
  SELECT
    20,
    'RLS POLICY',
    p.policyname,
    p.cmd,
    'roles=' || COALESCE(array_to_string(p.roles, ','), '<none>')
      || '; using=' || COALESCE(p.qual, '<none>'),
    'with_check=' || COALESCE(p.with_check, '<none>')
  FROM policy_rows AS p

  UNION ALL

  -- 3. Raw/effective table ACL text
  SELECT
    30,
    'TABLE ACL',
    'public.grades',
    'effective_acl',
    COALESCE(
      array_to_string(
        COALESCE(gt.relacl, acldefault('r', gt.relowner)),
        ','
      ),
      '<none>'
    ),
    'owner=' || pg_get_userbyid(gt.relowner)
  FROM grades_table AS gt

  UNION ALL

  -- 4. Effective direct privileges for the important application roles
  SELECT
    40,
    'TABLE PRIVILEGE',
    role_name,
    privilege_name,
    CASE
      WHEN has_table_privilege(role_name, 'public.grades', privilege_name)
      THEN 'YES'
      ELSE 'NO'
    END,
    NULL
  FROM (
    VALUES
      ('anon'::text, 'SELECT'::text),
      ('anon', 'INSERT'),
      ('anon', 'UPDATE'),
      ('anon', 'DELETE'),
      ('authenticated', 'SELECT'),
      ('authenticated', 'INSERT'),
      ('authenticated', 'UPDATE'),
      ('authenticated', 'DELETE'),
      ('service_role', 'SELECT'),
      ('service_role', 'INSERT'),
      ('service_role', 'UPDATE'),
      ('service_role', 'DELETE')
  ) AS v(role_name, privilege_name)

  UNION ALL

  -- 5. Explicit column grants from information_schema
  SELECT
    50,
    'COLUMN GRANT',
    rcg.grantee::text,
    rcg.column_name::text,
    rcg.privilege_type::text,
    NULL
  FROM information_schema.role_column_grants AS rcg
  WHERE rcg.table_schema = 'public'
    AND rcg.table_name = 'grades'

  UNION ALL

  -- 6. Table owner
  SELECT
    60,
    'TABLE OWNER',
    'public.grades',
    pg_get_userbyid(gt.relowner),
    'owner_oid=' || gt.relowner::text,
    NULL
  FROM grades_table AS gt

  UNION ALL

  -- 7. Views/materialized views depending on grades
  SELECT
    70,
    'DEPENDENT VIEW',
    dv.schema_name || '.' || dv.object_name,
    dv.object_type,
    'depends on public.grades',
    NULL
  FROM dependent_views AS dv

  UNION ALL

  -- 8. Functions whose source references grades
  SELECT
    80,
    'GRADE FUNCTION',
    gf.schema_name || '.' || gf.function_name || '(' || gf.identity_arguments || ')',
    CASE WHEN gf.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
    'search_path=' || COALESCE(array_to_string(gf.proconfig, ','), '<not explicitly set>'),
    'effective_acl=' || COALESCE(
      array_to_string(
        COALESCE(gf.proacl, acldefault('f', gf.proowner)),
        ','
      ),
      '<none>'
    )
  FROM grade_functions AS gf

  UNION ALL

  -- 9. Exact EXECUTE privileges for application roles on grade-related functions
  SELECT
    90,
    'FUNCTION EXECUTE',
    gf.function_name || '(' || gf.identity_arguments || ')',
    r.role_name,
    CASE
      WHEN has_function_privilege(r.role_name, gf.oid, 'EXECUTE')
      THEN 'YES'
      ELSE 'NO'
    END,
    CASE
      WHEN gf.prosecdef THEN 'SECURITY DEFINER'
      ELSE 'SECURITY INVOKER'
    END
  FROM grade_functions AS gf
  CROSS JOIN (
    VALUES
      ('anon'::text),
      ('authenticated'::text),
      ('service_role'::text)
  ) AS r(role_name)
)

SELECT
  section,
  item,
  role_or_command,
  detail_1,
  detail_2
FROM audit_rows
ORDER BY
  sort_order,
  section,
  item,
  role_or_command NULLS FIRST;
