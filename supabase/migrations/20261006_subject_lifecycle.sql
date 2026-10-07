-- STAGE 1B — SAFE SUBJECT LIFECYCLE
-- Purpose: Add subject lifecycle management with safe deletion and archival
--
-- This migration:
-- 1. Adds is_active field to subjects for archival/deactivation
-- 2. Creates admin-only RPC for safe subject deletion (atomic check + delete)
-- 3. Dependencies: class_subjects, grades (through class_subjects), homework
--
-- NOTE: Live production FK state differs from repository migrations:
-- - class_subjects.subject_id → subjects.id: ON DELETE NO ACTION (not CASCADE)
-- - grades.class_subject_id → class_subjects.id: ON DELETE NO ACTION (not CASCADE)
-- - homework.subject_id → subjects.id: ON DELETE CASCADE
-- - lesson_plans table does NOT exist in production
--
-- Deletion rule: Permanent delete allowed ONLY when ALL counts are zero:
-- - class_subject_count = 0
-- - grade_count = 0
-- - homework_count = 0

BEGIN;

-- ============================================================
-- 1. ADD LIFECYCLE FIELD TO SUBJECTS
-- ============================================================
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index for efficient filtering in assignment dropdowns
CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects(is_active);

-- ============================================================
-- 2. ADMIN-ONLY SAFE SUBJECT DELETION RPC
-- ============================================================
-- This RPC performs dependency checks and deletion atomically in one transaction
-- Returns structured result with deletion status and dependency counts
--
-- Authorization: Admin-only via public.is_admin()
-- Security: SECURITY DEFINER with hardened search_path

CREATE OR REPLACE FUNCTION public.delete_subject_if_unused(
  p_subject_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject_exists BOOLEAN;
  v_class_subject_count BIGINT;
  v_grade_count BIGINT;
  v_homework_count BIGINT;
  v_deleted_rows BIGINT;
  v_result jsonb;
BEGIN
  -- Check admin authorization
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Validate subject existence and lock the row
  SELECT EXISTS(
    SELECT 1 FROM public.subjects WHERE id = p_subject_id
  )
  INTO v_subject_exists;

  IF NOT v_subject_exists THEN
    v_result := jsonb_build_object(
      'deleted', false,
      'can_delete', false,
      'reason', 'Subject not found.',
      'class_subject_count', 0,
      'grade_count', 0,
      'homework_count', 0
    );
    RETURN v_result;
  END IF;

  -- Lock the target subject row for the duration of the transaction
  PERFORM 1 FROM public.subjects
  WHERE id = p_subject_id
  FOR UPDATE;

  -- Count class_subjects directly
  SELECT COUNT(*)
  INTO v_class_subject_count
  FROM public.class_subjects
  WHERE subject_id = p_subject_id;

  -- Count grades through class_subjects
  SELECT COUNT(DISTINCT g.id)
  INTO v_grade_count
  FROM public.grades g
  JOIN public.class_subjects cs ON g.class_subject_id = cs.id
  WHERE cs.subject_id = p_subject_id;

  -- Count homework directly
  SELECT COUNT(*)
  INTO v_homework_count
  FROM public.homework
  WHERE subject_id = p_subject_id;

  -- Determine if deletion is safe
  IF v_grade_count > 0 THEN
    -- Has historical academic records - PROHIBIT deletion
    v_result := jsonb_build_object(
      'deleted', false,
      'can_delete', false,
      'reason', 'This subject has academic records and cannot be permanently deleted. You can deactivate it instead.',
      'class_subject_count', v_class_subject_count,
      'grade_count', v_grade_count,
      'homework_count', v_homework_count
    );
  ELSIF v_class_subject_count > 0 THEN
    -- Currently assigned to classes - PROHIBIT deletion
    v_result := jsonb_build_object(
      'deleted', false,
      'can_delete', false,
      'reason', 'This subject is already assigned to one or more classes and cannot be permanently deleted. You can deactivate it instead.',
      'class_subject_count', v_class_subject_count,
      'grade_count', v_grade_count,
      'homework_count', v_homework_count
    );
  ELSIF v_homework_count > 0 THEN
    -- Has homework assignments - PROHIBIT deletion
    v_result := jsonb_build_object(
      'deleted', false,
      'can_delete', false,
      'reason', 'This subject has homework records and cannot be permanently deleted. You can deactivate it instead.',
      'class_subject_count', v_class_subject_count,
      'grade_count', v_grade_count,
      'homework_count', v_homework_count
    );
  ELSE
    -- Truly unused - ALLOW deletion (atomic)
    DELETE FROM public.subjects
    WHERE id = p_subject_id;

    -- Verify exactly one row was deleted
    GET DIAGNOSTICS v_deleted_rows = ROW_COUNT;

    IF v_deleted_rows = 1 THEN
      v_result := jsonb_build_object(
        'deleted', true,
        'can_delete', true,
        'reason', 'Subject deleted successfully.',
        'class_subject_count', v_class_subject_count,
        'grade_count', v_grade_count,
        'homework_count', v_homework_count
      );
    ELSE
      -- Unexpected: row was deleted by another transaction or didn't exist
      v_result := jsonb_build_object(
        'deleted', false,
        'can_delete', false,
        'reason', 'Subject could not be deleted. It may have been deleted by another process.',
        'class_subject_count', v_class_subject_count,
        'grade_count', v_grade_count,
        'homework_count', v_homework_count
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================
-- 3. RPC PERMISSIONS
-- ============================================================
-- Delete RPC: admin-only
REVOKE ALL ON FUNCTION public.delete_subject_if_unused(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_subject_if_unused(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_subject_if_unused(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_subject_if_unused(UUID) TO service_role;

COMMIT;
