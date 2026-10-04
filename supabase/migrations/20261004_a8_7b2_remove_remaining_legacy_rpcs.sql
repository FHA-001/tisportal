-- ============================================================
-- A8.7B2 — REMOVE REMAINING LEGACY RPCs
-- ============================================================
-- PURPOSE:
--   Remove additional legacy/dead RPC overloads discovered during
--   post-A8.7B database audit.
--
-- SCOPE:
--   - DROP 8 additional legacy/dead overloads
--   - Preserve all 11 Student custom-session RPCs (intentional)
--   - Preserve all Supabase Auth RPCs (zero-arg/reduced-arg versions)
--   - Preserve compatibility-session infrastructure (deferred to A8.7C)
--   - Preserve shared infrastructure (validate_custom_session, etc.)
-- ============================================================

BEGIN;

-- ============================================================
-- DROP LEGACY TEACHER DEAD CODE (1)
-- ============================================================
-- get_teacher_classes was never called by the frontend
-- Current Teacher UI uses get_teacher_class_subjects() instead
DROP FUNCTION IF EXISTS public.get_teacher_classes(TEXT);

-- ============================================================
-- DROP LEGACY ACCOUNTANT CUSTOM-SESSION OVERLOADS (4)
-- ============================================================
-- Accountant class fee overview
DROP FUNCTION IF EXISTS public.get_accountant_class_fee_overview(TEXT, UUID);

-- Accountant classes fee summary
DROP FUNCTION IF EXISTS public.get_accountant_classes_fee_summary(TEXT);

-- Accountant fee configuration
DROP FUNCTION IF EXISTS public.get_accountant_fee_configuration(TEXT);

-- Accountant school fee update
DROP FUNCTION IF EXISTS public.update_accountant_school_fee(TEXT, UUID, NUMERIC);

-- ============================================================
-- DROP HISTORICAL PAYMENT OVERLOADS (3)
-- ============================================================
-- Payment approval with accountant_id parameter
DROP FUNCTION IF EXISTS public.approve_payment_submission(UUID, UUID, TEXT);

-- Payment rejection with accountant_id parameter
DROP FUNCTION IF EXISTS public.reject_payment_submission(UUID, UUID, TEXT);

-- Payment submission with parent_id parameter
DROP FUNCTION IF EXISTS public.create_payment_submission(
  UUID, UUID, UUID, DECIMAL, DATE, TEXT, TEXT, TEXT, TEXT
);

COMMIT;
