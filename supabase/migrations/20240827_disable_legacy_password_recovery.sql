-- Disable legacy public password recovery system
-- This migration revokes browser access from legacy password recovery RPCs
-- and the password_reset_tokens table, preserving only administrative access

BEGIN;

-- ============================================================
-- 1. Revoke browser access from legacy recovery RPCs
-- ============================================================

-- Revoke browser access from request_password_reset
REVOKE EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) FROM authenticated;

-- Preserve administrative access
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.request_password_reset(TEXT, TEXT) TO service_role;

-- Revoke browser access from reset_password_with_token
REVOKE EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT, TEXT) FROM authenticated;

-- Preserve administrative access
GRANT EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT, TEXT) TO postgres;
GRANT EXECUTE ON FUNCTION public.reset_password_with_token(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- 2. Revoke direct browser access from password_reset_tokens table
-- ============================================================

-- Revoke all browser privileges from password_reset_tokens
REVOKE ALL PRIVILEGES ON TABLE public.password_reset_tokens FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.password_reset_tokens FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.password_reset_tokens FROM authenticated;

-- Preserve administrative access
GRANT ALL PRIVILEGES ON TABLE public.password_reset_tokens TO postgres;
GRANT ALL PRIVILEGES ON TABLE public.password_reset_tokens TO service_role;

COMMIT;
