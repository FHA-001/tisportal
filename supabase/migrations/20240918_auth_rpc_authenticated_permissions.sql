-- ============================================================
-- TIS Auth Modernization - A3 RPC permission bridge
--
-- Purpose:
-- Teacher / Accountant / Parent now authenticate with Supabase Auth,
-- so browser calls run as PostgreSQL role "authenticated".
--
-- Their existing protected RPCs still authorize with p_session_token.
-- This migration grants authenticated EXECUTE on ONLY those secure
-- token-validated RPCs needed by the migrated roles.
--
-- Student-only RPCs are intentionally NOT changed because Students
-- remain on the custom/anon authentication flow.
--
-- Legacy insecure overloads (UUID/no-token variants) are NOT granted.
-- ============================================================

BEGIN;

-- -------------------------
-- Teacher secure RPCs
-- -------------------------
GRANT EXECUTE ON FUNCTION public.get_students_by_teacher(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_student_by_teacher(jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_teacher_classes(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_class_subjects(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_teacher_grades(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_teacher_grades(text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_teacher_homework(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_homework_assignments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_homework(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_teacher_homework(text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_teacher_homework(text, uuid) TO authenticated;


-- -------------------------
-- Parent secure RPCs
-- -------------------------
GRANT EXECUTE ON FUNCTION public.get_parent_children(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_child_grades(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_payment_submissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_fee_payments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_school_account_details(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_submission(
  uuid, uuid, numeric, date, text, text, text, text, text
) TO authenticated;


-- -------------------------
-- Accountant secure RPCs
-- -------------------------
-- These four may already be granted; GRANT is idempotent.
GRANT EXECUTE ON FUNCTION public.get_accountant_classes_fee_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accountant_class_fee_overview(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accountant_fee_configuration(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_accountant_school_fee(text, uuid, numeric) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_accountant_fee_payments(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_payment_submissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_submission(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_payment_submission(uuid, text, text) TO authenticated;


-- -------------------------
-- Shared custom notifications
-- -------------------------
GRANT EXECUTE ON FUNCTION public.get_custom_notifications(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_custom_notification_read(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_custom_notifications_read(text) TO authenticated;


-- ----------------------------------------------------------------
-- Deliberately NOT granted to authenticated:
--
-- Student-only token RPCs:
--   get_student_grades(text,text,text)
--   get_student_homework(text)
--   get_student_teacher_directory(text)
--
-- Legacy custom-password function:
--   change_password(text,text,text)
--
-- Legacy insecure overloads such as:
--   get_parent_children(uuid)
--   get_parent_payment_submissions(uuid)
--   get_all_payment_submissions()
--
-- Students remain custom/anon. Migrated Supabase-auth roles should use
-- Supabase Auth password management rather than legacy custom hashes.
-- ----------------------------------------------------------------

COMMIT;
