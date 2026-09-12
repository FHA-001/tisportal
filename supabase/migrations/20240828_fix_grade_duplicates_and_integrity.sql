-- PHASE 2E — GRADE DUPLICATE CLEANUP AND INTEGRITY FIX
-- This migration removes confirmed duplicate grade rows and adds logical uniqueness protection
-- to prevent future duplicates in the grades table.

BEGIN;

-- ============================================================
-- 1. SAFE CLEANUP OF CONFIRMED BLANK DUPLICATE ROWS
-- ============================================================
-- These 3 duplicate rows were created during B6A-2 RPC failure when frontend lost grade IDs
-- Each DELETE is defensive and verifies exact logical identity before deletion

-- Emmanuel Eze duplicate (blank row)
DELETE FROM public.grades
WHERE id = '809b3449-94ce-4b58-963b-5538c1b0fbb8'
  AND student_id = '126705a9-5cab-47ab-80ed-b5a6bccf1cf0'
  AND class_subject_id = '78d2e8cd-e05b-40a5-bc6b-2a2c376ee24e'
  AND term = 'First Term'
  AND session = '2025/2026'
  AND test_1 IS NULL
  AND test_2 IS NULL
  AND project_1 IS NULL
  AND assignment_1 IS NULL
  AND exam IS NULL
  AND total IS NULL
  AND grade_letter IS NULL
  AND remark IS NULL;

-- Fatima Bello duplicate (blank row)
DELETE FROM public.grades
WHERE id = 'da5e0164-8e71-4f74-b234-eb2e4a034638'
  AND student_id = '24c93f30-83cc-4949-aec3-962074343d85'
  AND class_subject_id = '78d2e8cd-e05b-40a5-bc6b-2a2c376ee24e'
  AND term = 'First Term'
  AND session = '2025/2026'
  AND test_1 IS NULL
  AND test_2 IS NULL
  AND project_1 IS NULL
  AND assignment_1 IS NULL
  AND exam IS NULL
  AND total IS NULL
  AND grade_letter IS NULL
  AND remark IS NULL;

-- Nabilah Habib duplicate (blank row)
DELETE FROM public.grades
WHERE id = 'c4b47b9e-02d6-4d23-bca1-4ed8423a2a4a'
  AND student_id = '859d4c59-335a-4f5c-bb21-ca429803c9bf'
  AND class_subject_id = '78d2e8cd-e05b-40a5-bc6b-2a2c376ee24e'
  AND term = 'First Term'
  AND session = '2025/2026'
  AND test_1 IS NULL
  AND test_2 IS NULL
  AND project_1 IS NULL
  AND assignment_1 IS NULL
  AND exam IS NULL
  AND total IS NULL
  AND grade_letter IS NULL
  AND remark IS NULL;

-- ============================================================
-- ASSERTION: VERIFY NO DUPLICATE LOGICAL GRADES REMAIN
-- ============================================================
-- This safety check ensures the approved cleanup actually removed all duplicates
-- If any duplicates remain, the migration aborts before adding the constraint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.grades AS g
    GROUP BY
      g.student_id,
      g.class_subject_id,
      g.term,
      g.session
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate logical grade rows remain after approved cleanup; migration aborted';
  END IF;
END;
$$;

-- ============================================================
-- 2. ADD LOGICAL UNIQUENESS CONSTRAINT TO GRADES TABLE
-- ============================================================
-- Prevents duplicate grade rows for the same logical identity
-- NULLS NOT DISTINCT treats NULL session values as equal for uniqueness

ALTER TABLE public.grades
ADD CONSTRAINT grades_logical_identity_unique
UNIQUE NULLS NOT DISTINCT (
  student_id,
  class_subject_id,
  term,
  session
);

-- ============================================================
-- 3. HARDEN save_teacher_grades TO PREVENT FUTURE DUPLICATES
-- ============================================================
-- Replaces the vulnerable "if id exists UPDATE else INSERT" logic
-- with UPSERT behavior that protects logical identity even if grade ID is lost

CREATE OR REPLACE FUNCTION public.save_teacher_grades(
  p_session_token TEXT,
  p_grades JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
  v_teacher_id UUID;
  v_grade_item JSONB;
  v_grade_id UUID;
  v_student_id UUID;
  v_class_subject_id UUID;
  v_term TEXT;
  v_session_name TEXT;
  v_existing_class_subject_id UUID;
  v_existing_student_id UUID;
  v_class_id UUID;
  v_student_class_id UUID;
  v_idx INTEGER;
  v_grades_array JSONB[];
BEGIN
  -- Reject NULL/empty token
  IF p_session_token IS NULL OR p_session_token = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid session token'
    );
  END IF;

  -- Validate Teacher session and derive teacher_id
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(
    p_session_token,
    'teacher'
  )
  WHERE is_valid = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid session'
    );
  END IF;

  v_teacher_id := v_session.user_id;

  -- Validate p_grades is an array
  IF p_grades IS NULL OR jsonb_typeof(p_grades) <> 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Grades must be an array'
    );
  END IF;

  -- If empty array, return success without writes
  IF jsonb_array_length(p_grades) = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'No grades to save'
    );
  END IF;

  -- Convert to array for iteration
  v_grades_array := ARRAY(
    SELECT jsonb_array_elements(p_grades)
  );

  -- ============================================================
  -- PHASE 1: VALIDATE ALL ITEMS BEFORE ANY WRITES
  -- ============================================================
  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    -- Extract required fields
    v_student_id := (v_grade_item->>'student_id')::UUID;
    v_class_subject_id := (v_grade_item->>'class_subject_id')::UUID;
    v_term := v_grade_item->>'term';
    v_session_name := v_grade_item->>'session';
    v_grade_id := (v_grade_item->>'id')::UUID;

    -- Validate required fields exist
    IF v_student_id IS NULL OR v_class_subject_id IS NULL OR v_term IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Missing required fields: student_id, class_subject_id, or term'
      );
    END IF;

    -- ============================================================
    -- VALIDATION: class_subject_id must exist and belong to Teacher
    -- ============================================================
    SELECT cs.class_id
    INTO v_class_id
    FROM public.class_subjects AS cs
    WHERE cs.id = v_class_subject_id
      AND cs.teacher_id = v_teacher_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unauthorized class_subject_id or not assigned to this teacher'
      );
    END IF;

    -- ============================================================
    -- VALIDATION: student must exist and belong to the class
    -- ============================================================
    SELECT s.class_id
    INTO v_student_class_id
    FROM public.students AS s
    WHERE s.id = v_student_id
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Student not found'
      );
    END IF;

    IF v_student_class_id IS DISTINCT FROM v_class_id THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Student does not belong to this class'
      );
    END IF;

    -- ============================================================
    -- VALIDATION: For existing row ID, verify ownership and immutability
    -- ============================================================
    IF v_grade_id IS NOT NULL THEN
      -- Check if existing row exists
      SELECT g.class_subject_id, g.student_id
      INTO v_existing_class_subject_id, v_existing_student_id
      FROM public.grades AS g
      WHERE g.id = v_grade_id
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Grade ID not found'
        );
      END IF;

      -- Verify existing row belongs to Teacher's assignment
      SELECT cs.class_id
      INTO v_class_id
      FROM public.class_subjects AS cs
      WHERE cs.id = v_existing_class_subject_id
        AND cs.teacher_id = v_teacher_id
      LIMIT 1;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot modify grade from another teacher''s assignment'
        );
      END IF;

      -- Identity fields must NOT change
      IF v_existing_student_id != v_student_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot change student_id on existing grade'
        );
      END IF;

      IF v_existing_class_subject_id != v_class_subject_id THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Cannot change class_subject_id on existing grade'
        );
      END IF;
    END IF;
  END LOOP;

  -- ============================================================
  -- PHASE 2: ALL VALIDATIONS PASSED - PERFORM WRITES
  -- ============================================================
  FOR v_idx IN 1..array_length(v_grades_array, 1) LOOP
    v_grade_item := v_grades_array[v_idx];

    v_student_id := (v_grade_item->>'student_id')::UUID;
    v_class_subject_id := (v_grade_item->>'class_subject_id')::UUID;
    v_term := v_grade_item->>'term';
    v_session_name := v_grade_item->>'session';
    v_grade_id := (v_grade_item->>'id')::UUID;

    IF v_grade_id IS NOT NULL THEN
      -- Update existing grade by ID
      UPDATE public.grades AS g
      SET
        test_1 = (v_grade_item->>'test_1')::NUMERIC,
        test_2 = (v_grade_item->>'test_2')::NUMERIC,
        project_1 = (v_grade_item->>'project_1')::NUMERIC,
        assignment_1 = (v_grade_item->>'assignment_1')::NUMERIC,
        exam = (v_grade_item->>'exam')::NUMERIC,
        total = (v_grade_item->>'total')::NUMERIC,
        grade_letter = v_grade_item->>'grade_letter',
        remark = v_grade_item->>'remark',
        term = v_term,
        session = v_session_name,
        updated_at = now()
      WHERE g.id = v_grade_id;

    ELSE
      -- No grade ID provided - use UPSERT to prevent duplicates
      -- ON CONFLICT with logical uniqueness constraint prevents duplicate creation
      INSERT INTO public.grades (
        student_id,
        class_subject_id,
        term,
        session,
        test_1,
        test_2,
        project_1,
        assignment_1,
        exam,
        total,
        grade_letter,
        remark
      ) VALUES (
        v_student_id,
        v_class_subject_id,
        v_term,
        v_session_name,
        (v_grade_item->>'test_1')::NUMERIC,
        (v_grade_item->>'test_2')::NUMERIC,
        (v_grade_item->>'project_1')::NUMERIC,
        (v_grade_item->>'assignment_1')::NUMERIC,
        (v_grade_item->>'exam')::NUMERIC,
        (v_grade_item->>'total')::NUMERIC,
        v_grade_item->>'grade_letter',
        v_grade_item->>'remark'
      )
      ON CONFLICT (student_id, class_subject_id, term, session)
      DO UPDATE SET
        test_1 = EXCLUDED.test_1,
        test_2 = EXCLUDED.test_2,
        project_1 = EXCLUDED.project_1,
        assignment_1 = EXCLUDED.assignment_1,
        exam = EXCLUDED.exam,
        total = EXCLUDED.total,
        grade_letter = EXCLUDED.grade_letter,
        remark = EXCLUDED.remark,
        updated_at = now();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'saved_count', jsonb_array_length(p_grades)
  );
END;
$$;

-- ============================================================
-- 4. PERMISSIONS (preserve existing B6A-2 security model)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(TEXT, JSONB) TO service_role;

COMMIT;

-- ============================================================
-- 5. OPTIONAL: GLOBAL DUPLICATE DETECTION QUERY (for manual verification)
-- ============================================================
-- Run this separately to verify no other duplicates exist before constraint addition
-- COMMENTED OUT - run manually if needed for verification

/*
SELECT 
  g.student_id, s.full_name as student_name,
  g.class_subject_id, cs.class_id, c.name as class_name,
  cs.subject_id, sub.name as subject_name,
  g.term, g.session,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(g.id ORDER BY g.created_at) as grade_ids,
  ARRAY_AGG(
    CASE WHEN g.test_1 IS NULL AND g.test_2 IS NULL AND 
         g.project_1 IS NULL AND g.assignment_1 IS NULL AND 
         g.exam IS NULL AND g.total IS NULL AND g.grade_letter IS NULL 
    THEN 'blank' ELSE 'populated' END ORDER BY g.created_at
  ) as row_status
FROM public.grades g
JOIN public.students s ON g.student_id = s.id
JOIN public.class_subjects cs ON g.class_subject_id = cs.id
JOIN public.classes c ON cs.class_id = c.id
JOIN public.subjects sub ON cs.subject_id = sub.id
GROUP BY g.student_id, s.full_name, g.class_subject_id, cs.class_id, 
         c.name, cs.subject_id, sub.name, g.term, g.session
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, c.name, sub.name, s.full_name;
*/