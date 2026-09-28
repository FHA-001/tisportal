-- SAFE READ-ONLY SECURITY DEFINER FUNCTION AUDIT
WITH funcs AS (
  SELECT p.oid,p.proname,pg_get_function_identity_arguments(p.oid) identity_args,
         pg_get_function_arguments(p.oid) display_args,p.proacl,p.proconfig,p.prosrc
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prosecdef=true
),
a AS (
  SELECT f.*,
    COALESCE(array_to_string(f.proconfig,','),'<not explicitly set>') search_path_config,
    CASE WHEN f.proacl IS NULL THEN true ELSE array_to_string(f.proacl,',') ~ '(^|,)=X\*?/' END public_execute,
    has_function_privilege('anon',f.oid,'EXECUTE') anon_execute,
    has_function_privilege('authenticated',f.oid,'EXECUTE') authenticated_execute,
    has_function_privilege('service_role',f.oid,'EXECUTE') service_role_execute,
    (lower(f.prosrc) LIKE '%validate_custom_session%' OR lower(f.prosrc) LIKE '%custom_sessions%' OR lower(f.prosrc) LIKE '%p_session_token%') uses_session_validation,
    (lower(f.prosrc) LIKE '%auth.uid()%') uses_auth_uid,
    (lower(f.prosrc) LIKE '%p_user_id%' OR lower(f.prosrc) LIKE '%p_parent_id%' OR lower(f.prosrc) LIKE '%p_student_id%' OR lower(f.prosrc) LIKE '%p_teacher_id%' OR lower(f.prosrc) LIKE '%p_accountant_id%') uses_caller_supplied_identity,
    EXISTS (SELECT 1 FROM unnest(COALESCE(f.proconfig,ARRAY[]::text[])) cfg WHERE cfg LIKE 'search_path=%') has_explicit_search_path,
    EXISTS (SELECT 1 FROM unnest(COALESCE(f.proconfig,ARRAY[]::text[])) cfg WHERE cfg IN ('search_path=""','search_path=')) has_empty_search_path
  FROM funcs f
)
SELECT proname function_name,identity_args signature,display_args,search_path_config search_path,
       CASE WHEN public_execute THEN 'YES' ELSE 'NO' END public_execute,
       CASE WHEN anon_execute THEN 'YES' ELSE 'NO' END anon_execute,
       CASE WHEN authenticated_execute THEN 'YES' ELSE 'NO' END authenticated_execute,
       CASE WHEN service_role_execute THEN 'YES' ELSE 'NO' END service_role_execute,
       CASE WHEN uses_session_validation THEN 'YES' ELSE 'NO' END uses_session_validation,
       CASE WHEN uses_auth_uid THEN 'YES' ELSE 'NO' END uses_auth_uid,
       CASE WHEN uses_caller_supplied_identity THEN 'YES' ELSE 'NO' END uses_caller_supplied_identity,
       CASE WHEN has_explicit_search_path THEN 'YES' ELSE 'NO' END explicit_search_path,
       CASE WHEN has_empty_search_path THEN 'YES' ELSE 'NO' END empty_search_path,
       CASE
         WHEN NOT has_explicit_search_path THEN 'REVIEW: missing explicit search_path'
         WHEN public_execute AND NOT uses_session_validation AND lower(prosrc) NOT LIKE '%is_admin%' THEN 'REVIEW: PUBLIC execute without obvious validation'
         WHEN anon_execute AND NOT uses_session_validation AND lower(prosrc) NOT LIKE '%is_admin%' THEN 'REVIEW: anon execute without obvious validation'
         WHEN uses_caller_supplied_identity AND NOT uses_session_validation AND lower(prosrc) NOT LIKE '%is_admin%' THEN 'REVIEW: caller-supplied identity without obvious validation'
         ELSE 'OK / manual review'
       END security_note
FROM a
ORDER BY proname,identity_args;
