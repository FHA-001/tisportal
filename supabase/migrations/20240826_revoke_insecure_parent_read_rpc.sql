-- Stage C2: Revoke insecure parent read RPC overloads
-- This migration revokes browser access to the old UUID-based parent read RPCs
-- which have been replaced by secure session-token based overloads

BEGIN;

-- ============================================================
-- 1. REVOKE OLD get_parent_children(UUID) OVERLOAD
-- ============================================================

-- Revoke browser access to the old insecure UUID-based overload
REVOKE EXECUTE ON FUNCTION public.get_parent_children(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_children(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_parent_children(UUID) FROM authenticated;

-- Preserve service_role and postgres access for administrative purposes

-- ============================================================
-- 2. REVOKE OLD get_parent_payment_submissions(UUID) OVERLOAD
-- ============================================================

-- Revoke browser access to the old insecure UUID-based overload
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_parent_payment_submissions(UUID) FROM authenticated;

-- Preserve service_role and postgres access for administrative purposes

-- ============================================================
-- 3. SECURE REPLACEMENTS REMAIN UNTOUCHED
-- ============================================================

-- The following secure overloads remain active with their existing permissions:
-- - public.get_parent_children(TEXT) - session-token based, anon granted
-- - public.get_parent_payment_submissions(TEXT) - session-token based, anon granted
-- - public.get_parent_children_by_admin(UUID) - admin-only, authenticated granted

COMMIT;
