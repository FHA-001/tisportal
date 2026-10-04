-- Phase 5A: Class Teacher Assignment Foundation
-- Adds explicit class_teacher_id to classes table for Class Teacher/Class Master assignment
-- This is separate from class_subjects.teacher_id which represents subject teachers

BEGIN;

-- Add class_teacher_id column if it doesn't exist
ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS class_teacher_id UUID NULL;

-- Add foreign key constraint to teachers table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND constraint_name = 'classes_class_teacher_id_fkey'
  ) THEN
    ALTER TABLE public.classes
    ADD CONSTRAINT classes_class_teacher_id_fkey
    FOREIGN KEY (class_teacher_id)
    REFERENCES public.teachers(id)
    ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
