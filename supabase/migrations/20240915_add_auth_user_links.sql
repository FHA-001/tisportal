-- ============================================================
-- TIS Auth Modernization - A1
-- Add Supabase Auth linkage to existing Teacher/Accountant/Parent
-- profile rows without changing current login behavior.
--
-- IMPORTANT:
-- - Existing ids are preserved.
-- - Existing parent_students links are preserved.
-- - Existing teacher/class assignments are preserved.
-- - Students remain on custom username authentication.
-- - auth_user_id stays NULL until matching Supabase Auth users
--   are created in the next migration step.
-- ============================================================

BEGIN;

ALTER TABLE public.teachers
ADD COLUMN IF NOT EXISTS auth_user_id uuid;

ALTER TABLE public.parents
ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teachers_auth_user_id_fkey'
      AND conrelid = 'public.teachers'::regclass
  ) THEN
    ALTER TABLE public.teachers
    ADD CONSTRAINT teachers_auth_user_id_fkey
    FOREIGN KEY (auth_user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parents_auth_user_id_fkey'
      AND conrelid = 'public.parents'::regclass
  ) THEN
    ALTER TABLE public.parents
    ADD CONSTRAINT parents_auth_user_id_fkey
    FOREIGN KEY (auth_user_id)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_auth_user_id_unique
ON public.teachers(auth_user_id)
WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parents_auth_user_id_unique
ON public.parents(auth_user_id)
WHERE auth_user_id IS NOT NULL;

COMMIT;
