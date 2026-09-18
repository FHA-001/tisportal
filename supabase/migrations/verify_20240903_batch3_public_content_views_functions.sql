-- ============================================================
-- VERIFY BATCH 3 — READ ONLY
-- ============================================================

WITH checks(check_name, passed) AS (

  SELECT 'announcements RLS enabled',
         c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='announcements'

  UNION ALL
  SELECT 'announcements anon SELECT allowed',
         has_table_privilege('anon','public.announcements','SELECT')

  UNION ALL
  SELECT 'announcements anon writes blocked',
         NOT has_table_privilege('anon','public.announcements','INSERT,UPDATE,DELETE')

  UNION ALL
  SELECT 'announcements authenticated CRUD grants present',
         has_table_privilege('authenticated','public.announcements','SELECT')
         AND has_table_privilege('authenticated','public.announcements','INSERT')
         AND has_table_privilege('authenticated','public.announcements','UPDATE')
         AND has_table_privilege('authenticated','public.announcements','DELETE')

  UNION ALL
  SELECT 'announcements admin write policies gated by is_admin',
         COUNT(*) FILTER (
           WHERE cmd IN ('INSERT','UPDATE','DELETE')
             AND array_to_string(roles,',')='authenticated'
             AND (
               COALESCE(qual,'') LIKE '%is_admin%'
               OR COALESCE(with_check,'') LIKE '%is_admin%'
             )
         ) = 3
  FROM pg_policies
  WHERE schemaname='public' AND tablename='announcements'

  UNION ALL
  SELECT 'newsletters RLS enabled',
         c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='newsletters'

  UNION ALL
  SELECT 'newsletters anon SELECT allowed',
         has_table_privilege('anon','public.newsletters','SELECT')

  UNION ALL
  SELECT 'newsletters anon writes blocked',
         NOT has_table_privilege('anon','public.newsletters','INSERT,UPDATE,DELETE')

  UNION ALL
  SELECT 'newsletters published-only anon policy exists',
         COUNT(*) = 1
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename='newsletters'
    AND cmd='SELECT'
    AND 'anon'=ANY(roles)
    AND qual LIKE '%is_published%true%'

  UNION ALL
  SELECT 'newsletters admin write policies gated by is_admin',
         COUNT(*) FILTER (
           WHERE cmd IN ('INSERT','UPDATE','DELETE')
             AND array_to_string(roles,',')='authenticated'
             AND (
               COALESCE(qual,'') LIKE '%is_admin%'
               OR COALESCE(with_check,'') LIKE '%is_admin%'
             )
         ) = 3
  FROM pg_policies
  WHERE schemaname='public' AND tablename='newsletters'

  UNION ALL
  SELECT 'teachers_directory anon SELECT blocked',
         NOT has_table_privilege('anon','public.teachers_directory','SELECT')

  UNION ALL
  SELECT 'teachers_directory authenticated SELECT retained',
         has_table_privilege('authenticated','public.teachers_directory','SELECT')

  UNION ALL
  SELECT 'pending_student_signups anon SELECT blocked',
         NOT has_table_privilege('anon','public.pending_student_signups','SELECT')

  UNION ALL
  SELECT 'pending_student_signups authenticated SELECT retained',
         has_table_privilege('authenticated','public.pending_student_signups','SELECT')

  UNION ALL
  SELECT 'create_notification anon blocked',
         NOT has_function_privilege('anon',
           'public.create_notification(text,uuid,text,text,text,uuid)',
           'EXECUTE')

  UNION ALL
  SELECT 'create_notification authenticated blocked',
         NOT has_function_privilege('authenticated',
           'public.create_notification(text,uuid,text,text,text,uuid)',
           'EXECUTE')

  UNION ALL
  SELECT 'generate_receipt_number anon blocked',
         NOT has_function_privilege('anon',
           'public.generate_receipt_number()',
           'EXECUTE')

  UNION ALL
  SELECT 'service_role preserved announcements',
         has_table_privilege('service_role','public.announcements','SELECT,INSERT,UPDATE,DELETE')

  UNION ALL
  SELECT 'service_role preserved newsletters',
         has_table_privilege('service_role','public.newsletters','SELECT,INSERT,UPDATE,DELETE')
)
SELECT
  check_name,
  passed,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_name;

WITH checks(passed) AS (
  SELECT c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='announcements'
  UNION ALL SELECT c.relrowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='newsletters'
  UNION ALL SELECT has_table_privilege('anon','public.announcements','SELECT')
  UNION ALL SELECT NOT has_table_privilege('anon','public.announcements','INSERT,UPDATE,DELETE')
  UNION ALL SELECT has_table_privilege('anon','public.newsletters','SELECT')
  UNION ALL SELECT NOT has_table_privilege('anon','public.newsletters','INSERT,UPDATE,DELETE')
  UNION ALL SELECT NOT has_table_privilege('anon','public.teachers_directory','SELECT')
  UNION ALL SELECT NOT has_table_privilege('anon','public.pending_student_signups','SELECT')
  UNION ALL SELECT NOT has_function_privilege('anon','public.create_notification(text,uuid,text,text,text,uuid)','EXECUTE')
  UNION ALL SELECT NOT has_function_privilege('anon','public.generate_receipt_number()','EXECUTE')
)
SELECT
  COUNT(*) total_checks,
  COUNT(*) FILTER (WHERE passed) passed_checks,
  COUNT(*) FILTER (WHERE NOT passed) failed_checks,
  bool_and(passed) all_checks_pass
FROM checks;
