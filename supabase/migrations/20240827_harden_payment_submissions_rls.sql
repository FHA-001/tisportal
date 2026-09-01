-- Harden payment_submissions table with RLS
-- This migration enables RLS on payment_submissions and restricts direct access
-- Parent and Accountant workflows now use secure RPCs only
-- Admin uses authenticated SELECT with is_admin() RLS policy

BEGIN;

-- ============================================================
-- 1. Enable Row Level Security
-- ============================================================

ALTER TABLE public.payment_submissions
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Remove all existing policies on payment_submissions
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'payment_submissions'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.payment_submissions',
      r.policyname
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Create Admin SELECT policy
-- ============================================================

CREATE POLICY "Trusted admins can view payment submissions"
ON public.payment_submissions
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin())
);

-- ============================================================
-- 4. Revoke all direct browser table privileges
-- ============================================================

REVOKE ALL PRIVILEGES
ON TABLE public.payment_submissions
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON TABLE public.payment_submissions
FROM anon;

REVOKE ALL PRIVILEGES
ON TABLE public.payment_submissions
FROM authenticated;

-- ============================================================
-- 5. Grant authenticated SELECT only
-- ============================================================

GRANT SELECT
ON TABLE public.payment_submissions
TO authenticated;

-- ============================================================
-- 6. Preserve administrative access
-- ============================================================

GRANT ALL PRIVILEGES
ON TABLE public.payment_submissions
TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.payment_submissions
TO postgres;

COMMIT;
