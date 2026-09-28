-- SAFE READ-ONLY REMAINING SECURITY AUDIT
WITH targets(table_name) AS (
  VALUES ('school_account_details'::text),('parents'),('teachers'),('teachers_directory'),
         ('pending_student_signups'),('academic_sessions'),('school_fees'),('payment_accounts'),
         ('announcements'),('audit_logs'),('subjects'),('class_subjects'),('newsletters'),('notifications')
),
relations AS (
  SELECT t.table_name,c.oid,c.relkind,c.relowner,c.relrowsecurity,c.relforcerowsecurity
  FROM targets t
  LEFT JOIN pg_namespace n ON n.nspname='public'
  LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=t.table_name AND c.relkind IN ('r','p','v','m')
),
rows AS (
  SELECT 10 ord,'RELATION'::text section,r.table_name,'exists/type'::text item,NULL::text role_or_command,
         CASE WHEN r.oid IS NULL THEN 'MISSING' ELSE 'EXISTS' END::text detail_1,
         CASE r.relkind WHEN 'r' THEN 'table' WHEN 'p' THEN 'partitioned table' WHEN 'v' THEN 'view'
              WHEN 'm' THEN 'materialized view' ELSE NULL END::text detail_2
  FROM relations r

  UNION ALL
  SELECT 20,'RLS STATUS',r.table_name,'rls',NULL,
         CASE WHEN r.relkind IN ('r','p') THEN CASE WHEN r.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END ELSE 'N/A' END,
         CASE WHEN r.relkind IN ('r','p') THEN CASE WHEN r.relforcerowsecurity THEN 'FORCE ENABLED' ELSE 'FORCE DISABLED' END ELSE 'N/A' END
  FROM relations r WHERE r.oid IS NOT NULL

  UNION ALL
  SELECT 30,'OWNER',r.table_name,'owner',NULL,pg_get_userbyid(r.relowner),NULL
  FROM relations r WHERE r.oid IS NOT NULL

  UNION ALL
  SELECT 40,'RLS POLICY',p.tablename,p.policyname,p.cmd,
         'roles='||COALESCE(array_to_string(p.roles,','),'<none>')||'; using='||COALESCE(p.qual,'<none>'),
         'with_check='||COALESCE(p.with_check,'<none>')
  FROM pg_policies p JOIN targets t ON t.table_name=p.tablename
  WHERE p.schemaname='public'

  UNION ALL
  SELECT 50,'TABLE PRIVILEGE',r.table_name,v.privilege_name,v.role_name,
         CASE WHEN has_table_privilege(v.role_name,format('public.%I',r.table_name),v.privilege_name) THEN 'YES' ELSE 'NO' END,
         NULL
  FROM relations r
  CROSS JOIN (VALUES
    ('anon'::text,'SELECT'::text),('anon','INSERT'),('anon','UPDATE'),('anon','DELETE'),
    ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','UPDATE'),('authenticated','DELETE'),
    ('service_role','SELECT'),('service_role','INSERT'),('service_role','UPDATE'),('service_role','DELETE')
  ) v(role_name,privilege_name)
  WHERE r.oid IS NOT NULL

  UNION ALL
  SELECT 60,'COLUMN PRIVILEGE SUMMARY',r.table_name,v.privilege_name,v.role_name,
         CASE WHEN has_any_column_privilege(v.role_name,format('public.%I',r.table_name),v.privilege_name) THEN 'YES' ELSE 'NO' END,
         NULL
  FROM relations r
  CROSS JOIN (VALUES
    ('anon'::text,'SELECT'::text),('anon','INSERT'),('anon','UPDATE'),('anon','REFERENCES'),
    ('authenticated','SELECT'),('authenticated','INSERT'),('authenticated','UPDATE'),('authenticated','REFERENCES'),
    ('service_role','SELECT'),('service_role','INSERT'),('service_role','UPDATE'),('service_role','REFERENCES')
  ) v(role_name,privilege_name)
  WHERE r.oid IS NOT NULL

  UNION ALL
  SELECT 70,'VIEW DEFINITION',r.table_name,'definition',NULL,pg_get_viewdef(r.oid,true),NULL
  FROM relations r WHERE r.relkind IN ('v','m')

  UNION ALL
  SELECT 80,'FUNCTION REFERENCE',t.table_name,
         n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
         CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
         'search_path='||COALESCE(array_to_string(p.proconfig,','),'<not explicitly set>'),
         'anon='||(CASE WHEN has_function_privilege('anon',p.oid,'EXECUTE') THEN 'YES' ELSE 'NO' END)||
         '; authenticated='||(CASE WHEN has_function_privilege('authenticated',p.oid,'EXECUTE') THEN 'YES' ELSE 'NO' END)||
         '; service_role='||(CASE WHEN has_function_privilege('service_role',p.oid,'EXECUTE') THEN 'YES' ELSE 'NO' END)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  CROSS JOIN targets t
  WHERE n.nspname='public' AND lower(p.prosrc) LIKE '%'||lower(t.table_name)||'%'
)
SELECT section,table_name,item,role_or_command,detail_1,detail_2
FROM rows
ORDER BY ord,table_name,section,item,role_or_command NULLS FIRST;
