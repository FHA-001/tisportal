BEGIN;

-- Phase 2B Stage C: Revoke Insecure Payment Review Overloads
-- This migration revokes EXECUTE permissions from the old insecure overloads
-- that trusted client-supplied accountant IDs. The secure overloads with
-- session-based authentication are now used by the production frontend.

-- Revoke EXECUTE from old insecure approve_payment_submission overload
-- Signature: approve_payment_submission(UUID, UUID, TEXT)
REVOKE EXECUTE ON FUNCTION public.approve_payment_submission(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_payment_submission(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_payment_submission(UUID, UUID, TEXT) FROM authenticated;

-- Revoke EXECUTE from old insecure reject_payment_submission overload
-- Signature: reject_payment_submission(UUID, UUID, TEXT)
REVOKE EXECUTE ON FUNCTION public.reject_payment_submission(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reject_payment_submission(UUID, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_payment_submission(UUID, UUID, TEXT) FROM authenticated;

-- Note: postgres and service_role access remains intact for administrative purposes
-- Secure overloads (UUID, TEXT, TEXT) remain unchanged and callable by anon

COMMIT;
