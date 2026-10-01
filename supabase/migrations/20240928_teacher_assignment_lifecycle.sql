-- Teacher assignment lifecycle safety
-- Keeps class_subjects as the permanent class+subject row.
-- Allows teacher_id to be NULL.
-- Clears existing scores when a teacher assignment changes.
-- Preserves grade rows so a future teacher can reuse the same logical records.

BEGIN;

ALTER TABLE public.class_subjects
  ALTER COLUMN teacher_id DROP NOT NULL;

ALTER TABLE public.class_subjects
  DROP CONSTRAINT IF EXISTS class_subjects_teacher_id_fkey;

ALTER TABLE public.class_subjects
  ADD CONSTRAINT class_subjects_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.teachers(id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.handle_class_subject_teacher_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.teacher_id IS DISTINCT FROM NEW.teacher_id THEN
    UPDATE public.grades AS g
    SET
      test_1 = NULL,
      test_2 = NULL,
      project_1 = NULL,
      assignment_1 = NULL,
      exam = NULL,
      total = NULL,
      grade_letter = NULL,
      remark = NULL,
      updated_at = now()
    WHERE g.class_subject_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_subject_teacher_change
ON public.class_subjects;

CREATE TRIGGER trg_class_subject_teacher_change
BEFORE UPDATE OF teacher_id
ON public.class_subjects
FOR EACH ROW
EXECUTE FUNCTION public.handle_class_subject_teacher_change();

CREATE OR REPLACE FUNCTION public.handle_teacher_delete_clear_grades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.grades AS g
  SET
    test_1 = NULL,
    test_2 = NULL,
    project_1 = NULL,
    assignment_1 = NULL,
    exam = NULL,
    total = NULL,
    grade_letter = NULL,
    remark = NULL,
    updated_at = now()
  WHERE g.class_subject_id IN (
    SELECT cs.id
    FROM public.class_subjects AS cs
    WHERE cs.teacher_id = OLD.id
  );

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_teacher_delete_clear_grades
ON public.teachers;

CREATE TRIGGER trg_teacher_delete_clear_grades
BEFORE DELETE
ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.handle_teacher_delete_clear_grades();

CREATE OR REPLACE FUNCTION public.admin_unassign_class_subject_teacher(
  p_class_subject_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_teacher_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized'
    );
  END IF;

  SELECT cs.teacher_id
  INTO v_old_teacher_id
  FROM public.class_subjects AS cs
  WHERE cs.id = p_class_subject_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'assignment_not_found'
    );
  END IF;

  IF v_old_teacher_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unassigned', true,
      'class_subject_id', p_class_subject_id
    );
  END IF;

  UPDATE public.class_subjects AS cs
  SET
    teacher_id = NULL,
    updated_at = now()
  WHERE cs.id = p_class_subject_id;

  RETURN jsonb_build_object(
    'success', true,
    'class_subject_id', p_class_subject_id,
    'previous_teacher_id', v_old_teacher_id
  );
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_unassign_class_subject_teacher(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_unassign_class_subject_teacher(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.admin_unassign_class_subject_teacher(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_unassign_class_subject_teacher(uuid)
TO service_role;

COMMIT;
