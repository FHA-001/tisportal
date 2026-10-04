-- ============================================================
-- A8.7B — REMOVE LEGACY CUSTOM-SESSION RPC OVERLOADS
-- ============================================================
-- PURPOSE:
--   Remove obsolete custom-session RPC overloads for Teacher,
--   Accountant, and Parent that have been replaced by Supabase Auth
--   equivalents.
--
-- SCOPE:
--   - DROP 19 legacy overloads with p_session_token parameters
--   - Preserve all Supabase Auth RPCs (zero-arg/reduced-arg versions)
--   - Preserve all Student custom-session RPCs (intentional)
--   - Preserve compatibility-session infrastructure (deferred to A8.7C)
--   - Preserve shared infrastructure (validate_custom_session, etc.)
-- ============================================================

BEGIN;

-- ============================================================
-- DROP LEGACY PAYMENT RPC OVERLOADS (4)
-- ============================================================
-- Accountant payment-submission listing
DROP FUNCTION IF EXISTS public.get_all_payment_submissions(TEXT);

-- Accountant payment approval
DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, TEXT, TEXT);

-- Accountant payment rejection
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, TEXT, TEXT);

-- Parent payment submission creation
DROP FUNCTION IF EXISTS public.create_payment_submission(UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, TEXT);

-- ============================================================
-- DROP LEGACY PARENT RPC OVERLOADS (5)
-- ============================================================
-- Parent children listing
DROP FUNCTION IF EXISTS public.get_parent_children(TEXT);

-- Parent child grades
DROP FUNCTION IF EXISTS public.get_parent_child_grades(TEXT, UUID, TEXT, TEXT);

-- Parent fee payment history
DROP FUNCTION IF EXISTS public.get_parent_fee_payments(TEXT);

-- Parent payment submissions
DROP FUNCTION IF EXISTS public.get_parent_payment_submissions(TEXT);

-- Parent school account details
DROP FUNCTION IF EXISTS public.get_parent_school_account_details(TEXT);

-- ============================================================
-- DROP LEGACY TEACHER RPC OVERLOADS (9)
-- ============================================================
-- Teacher grade reading
DROP FUNCTION IF EXISTS public.get_teacher_grades(TEXT, UUID, TEXT, TEXT);

-- Teacher grade saving
DROP FUNCTION IF EXISTS public.save_teacher_grades(TEXT, JSONB);

-- Teacher homework listing
DROP FUNCTION IF EXISTS public.get_teacher_homework(TEXT);

-- Teacher homework creation
DROP FUNCTION IF EXISTS public.create_teacher_homework(TEXT, JSONB);

-- Teacher homework update
DROP FUNCTION IF EXISTS public.update_teacher_homework(TEXT, UUID, JSONB);

-- Teacher homework deletion
DROP FUNCTION IF EXISTS public.delete_teacher_homework(TEXT, UUID);

-- Teacher student listing
DROP FUNCTION IF EXISTS public.get_students_by_teacher(UUID, TEXT);

-- Teacher class/subject assignments
DROP FUNCTION IF EXISTS public.get_teacher_class_subjects(TEXT);

-- Teacher homework assignments (dead code)
DROP FUNCTION IF EXISTS public.get_teacher_homework_assignments(TEXT);

-- ============================================================
-- DROP LEGACY ACCOUNTANT RPC OVERLOADS (1)
-- ============================================================
-- Accountant fee payment analytics
DROP FUNCTION IF EXISTS public.get_accountant_fee_payments(TEXT);

COMMIT;
