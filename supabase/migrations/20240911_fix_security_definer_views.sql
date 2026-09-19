BEGIN;

ALTER VIEW public.pending_student_signups
SET (security_invoker = true);

ALTER VIEW public.teachers_directory
SET (security_invoker = true);

COMMIT;