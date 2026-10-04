-- ============================================================
-- PHASE 5B CONSOLIDATED VERIFICATION (ONE RESULT TABLE)
-- ============================================================
-- Run this after applying 20261004_phase5b_report_card_enhancements.sql
-- Returns all checks as rows in a single result table for easy review.
--
-- This verification uses robust PostgreSQL catalog checks with:
--   - pg_namespace n ON n.oid = p.pronamespace
--   - to_regprocedure() for precise function identification (avoids named-argument issues)
--   - pg_get_functiondef(p.oid) for source code inspection
--   - has_function_privilege() for role permission verification
--   - pg_proc.proacl with aclexplode() for PUBLIC privilege verification
--   - Flexible pattern matching for authorization source checks
-- ============================================================

WITH verification_checks AS (
  -- Check 1: Student RPC exists
  SELECT
    1 as check_id,
    'Student RPC exists' as check_category,
    'Function exists' as expected,
    CASE
      WHEN to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL
      THEN 'Function exists'
      ELSE 'Function missing'
    END as actual,
    CASE
      WHEN to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL
      THEN 'PASS'
      ELSE 'FAIL'
    END as status

  UNION ALL

  -- Check 2: Parent RPC exists
  SELECT
    2,
    'Parent RPC exists',
    'Function exists',
    CASE
      WHEN to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL
      THEN 'Function exists'
      ELSE 'Function missing'
    END,
    CASE
      WHEN to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL
      THEN 'PASS'
      ELSE 'FAIL'
    END

  UNION ALL

  -- Check 3: Legacy Parent 4-argument overload absent
  SELECT
    3,
    'Legacy Parent 4-arg overload absent',
    'Function absent',
    CASE
      WHEN to_regprocedure('public.get_parent_child_grades(text,uuid,text,text)') IS NULL
      THEN 'Function absent'
      ELSE 'Function exists'
    END,
    CASE
      WHEN to_regprocedure('public.get_parent_child_grades(text,uuid,text,text)') IS NULL
      THEN 'PASS'
      ELSE 'FAIL'
    END

  UNION ALL

  -- Check 4: Student RPC returns class_teacher_name (using pg_get_functiondef)
  SELECT
    4,
    'Student RPC returns class_teacher_name',
    'Present in RETURNS TABLE and SELECT',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%class_teacher_name%'
      THEN 'Present' ELSE 'Missing' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%class_teacher_name%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_student_grades'
    AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL

  UNION ALL

  -- Check 5: Parent RPC returns class_teacher_name (using pg_get_functiondef)
  SELECT
    5,
    'Parent RPC returns class_teacher_name',
    'Present in RETURNS TABLE and SELECT',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%class_teacher_name%'
      THEN 'Present' ELSE 'Missing' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%class_teacher_name%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_parent_child_grades'
    AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL

  UNION ALL

  -- Check 6: Student SECURITY DEFINER = true
  SELECT
    6,
    'Student SECURITY DEFINER',
    'true',
    CASE
      WHEN p.prosecdef THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN p.prosecdef THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_student_grades'
    AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL

  UNION ALL

  -- Check 7: Parent SECURITY DEFINER = true
  SELECT
    7,
    'Parent SECURITY DEFINER',
    'true',
    CASE
      WHEN p.prosecdef THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN p.prosecdef THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_parent_child_grades'
    AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL

  UNION ALL

  -- Check 8: Student search_path=''
  SELECT
    8,
    'Student search_path',
    'search_path=""',
    COALESCE(array_to_string(p.proconfig,','), '<not set>'),
    CASE
      WHEN array_to_string(p.proconfig,',') = 'search_path=""' THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_student_grades'
    AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL

  UNION ALL

  -- Check 9: Parent search_path=''
  SELECT
    9,
    'Parent search_path',
    'search_path=""',
    COALESCE(array_to_string(p.proconfig,','), '<not set>'),
    CASE
      WHEN array_to_string(p.proconfig,',') = 'search_path=""' THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_parent_child_grades'
    AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL

  UNION ALL

  -- Check 10: Student anon execute = true
  SELECT
    10,
    'Student anon execute',
    'true',
    CASE
      WHEN has_function_privilege('anon', 'public.get_student_grades(text,text,text)', 'EXECUTE')
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN has_function_privilege('anon', 'public.get_student_grades(text,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 11: Student authenticated execute = false
  SELECT
    11,
    'Student authenticated execute',
    'false',
    CASE
      WHEN has_function_privilege('authenticated', 'public.get_student_grades(text,text,text)', 'EXECUTE')
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN NOT has_function_privilege('authenticated', 'public.get_student_grades(text,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 12: Student service_role execute = true
  SELECT
    12,
    'Student service_role execute',
    'true',
    CASE
      WHEN has_function_privilege('service_role', 'public.get_student_grades(text,text,text)', 'EXECUTE')
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN has_function_privilege('service_role', 'public.get_student_grades(text,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 13: Student PUBLIC execute = false (using aclexplode)
  SELECT
    13,
    'Student PUBLIC execute',
    'false',
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
        WHERE n.nspname = 'public'
          AND p.proname = 'get_student_grades'
          AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
        WHERE n.nspname = 'public'
          AND p.proname = 'get_student_grades'
          AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 14: Parent anon execute = false
  SELECT
    14,
    'Parent anon execute',
    'false',
    CASE
      WHEN has_function_privilege('anon', 'public.get_parent_child_grades(uuid,text,text)', 'EXECUTE')
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN NOT has_function_privilege('anon', 'public.get_parent_child_grades(uuid,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 15: Parent authenticated execute = true
  SELECT
    15,
    'Parent authenticated execute',
    'true',
    CASE
      WHEN has_function_privilege('authenticated', 'public.get_parent_child_grades(uuid,text,text)', 'EXECUTE')
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN has_function_privilege('authenticated', 'public.get_parent_child_grades(uuid,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 16: Parent service_role execute = true
  SELECT
    16,
    'Parent service_role execute',
    'true',
    CASE
      WHEN has_function_privilege('service_role', 'public.get_parent_child_grades(uuid,text,text)', 'EXECUTE')
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN has_function_privilege('service_role', 'public.get_parent_child_grades(uuid,text,text)', 'EXECUTE')
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 17: Parent PUBLIC execute = false (using aclexplode)
  SELECT
    17,
    'Parent PUBLIC execute',
    'false',
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
        WHERE n.nspname = 'public'
          AND p.proname = 'get_parent_child_grades'
          AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      THEN 'true'::text ELSE 'false'::text END,
    CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        CROSS JOIN LATERAL aclexplode(p.proacl) AS acl
        WHERE n.nspname = 'public'
          AND p.proname = 'get_parent_child_grades'
          AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 18: Student class_teacher join exists
  SELECT
    18,
    'Student class_teacher join',
    'Join present',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%teachers%' AND pg_get_functiondef(p.oid) ILIKE '%class_teacher_id%'
      THEN 'Join present' ELSE 'Join missing' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%teachers%' AND pg_get_functiondef(p.oid) ILIKE '%class_teacher_id%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_student_grades'
    AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL

  UNION ALL

  -- Check 19: Parent class_teacher join exists
  SELECT
    19,
    'Parent class_teacher join',
    'Join present',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%teachers%' AND pg_get_functiondef(p.oid) ILIKE '%class_teacher_id%'
      THEN 'Join present' ELSE 'Join missing' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%teachers%' AND pg_get_functiondef(p.oid) ILIKE '%class_teacher_id%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_parent_child_grades'
    AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL

  UNION ALL

  -- Check 20: Legacy Parent custom-session overload absent
  SELECT
    20,
    'Legacy Parent custom-session overload absent',
    'Function absent',
    CASE
      WHEN to_regprocedure('public.get_parent_child_grades(text,uuid,text,text)') IS NULL
      THEN 'Function absent' ELSE 'Function exists' END,
    CASE
      WHEN to_regprocedure('public.get_parent_child_grades(text,uuid,text,text)') IS NULL
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 21: Legacy Teacher grade RPC absent
  SELECT
    21,
    'Legacy Teacher grade RPC absent',
    'Function absent',
    CASE
      WHEN to_regprocedure('public.get_teacher_grades(text,uuid,text,text)') IS NULL
      THEN 'Function absent' ELSE 'Function exists' END,
    CASE
      WHEN to_regprocedure('public.get_teacher_grades(text,uuid,text,text)') IS NULL
      THEN 'PASS' ELSE 'FAIL' END

  UNION ALL

  -- Check 22: Student uses validate_custom_session
  SELECT
    22,
    'Student uses validate_custom_session',
    'Uses validate_custom_session',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%validate_custom_session%' AND pg_get_functiondef(p.oid) ILIKE '%student%'
      THEN 'Uses validate_custom_session' ELSE 'Not found' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%validate_custom_session%' AND pg_get_functiondef(p.oid) ILIKE '%student%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_student_grades'
    AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL

  UNION ALL

  -- Check 23: Student validates role='student' parameter
  SELECT
    23,
    'Student validates role=student',
    'Validates role=student',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%''student''%'
      THEN 'Validates role=student' ELSE 'Not found' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%''student''%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_student_grades'
    AND to_regprocedure('public.get_student_grades(text,text,text)') IS NOT NULL

  UNION ALL

  -- Check 24: Parent derives identity through current_parent_id
  SELECT
    24,
    'Parent derives identity through current_parent_id',
    'Uses current_parent_id',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%current_parent_id%'
      THEN 'Uses current_parent_id' ELSE 'Not found' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%current_parent_id%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_parent_child_grades'
    AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL

  UNION ALL

  -- Check 25: Parent checks parent_students relationship
  SELECT
    25,
    'Parent checks parent_students relationship',
    'Validates parent_students',
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%parent_students%'
      THEN 'Validates parent_students' ELSE 'Not found' END,
    CASE
      WHEN pg_get_functiondef(p.oid) ILIKE '%parent_students%'
      THEN 'PASS' ELSE 'FAIL' END
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_parent_child_grades'
    AND to_regprocedure('public.get_parent_child_grades(uuid,text,text)') IS NOT NULL
)
SELECT
  check_category,
  expected,
  actual,
  status
FROM verification_checks
ORDER BY check_id;
