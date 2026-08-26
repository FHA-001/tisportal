BEGIN;

-- Phase 2C Stage C1: Revoke Insecure Parent Payment Submission Overload
-- This migration revokes EXECUTE permissions from the old insecure overload
-- that trusted client-supplied parent IDs. The secure overload with
-- session-based authentication is now used by the production frontend.

-- Revoke EXECUTE from old insecure create_payment_submission overload
-- Signature: create_payment_submission(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT)
REVOKE EXECUTE ON FUNCTION public.create_payment_submission(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_payment_submission(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_payment_submission(UUID, UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- Note: postgres and service_role access remains intact for administrative purposes
-- Secure overload (UUID, UUID, NUMERIC, DATE, TEXT, TEXT, TEXT, TEXT, TEXT) remains unchanged and callable by anon

COMMIT;
