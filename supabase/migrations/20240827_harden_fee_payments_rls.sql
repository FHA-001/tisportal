-- Harden fee_payments table with RLS
-- This migration enables RLS on fee_payments and restricts direct access
-- Parent uses secure RPC only
-- Accountant uses secure RPC only
-- Admin uses authenticated SELECT/INSERT/DELETE with is_admin() RLS policy

BEGIN;

-- ============================================================
-- 1. Enable Row Level Security
-- ============================================================

ALTER TABLE public.fee_payments
ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Remove all existing policies on fee_payments
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fee_payments'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.fee_payments',
      r.policyname
    );
  END LOOP;
END;
$$;

-- ============================================================
-- 3. Create Admin SELECT policy
-- ============================================================

CREATE POLICY "Trusted admins can view fee payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
  (SELECT public.is_admin())
);

-- ============================================================
-- 4. Create Admin INSERT policy
-- ============================================================

CREATE POLICY "Trusted admins can create fee payments"
ON public.fee_payments
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT public.is_admin())
);

-- ============================================================
-- 5. Create Admin DELETE policy
-- ============================================================

CREATE POLICY "Trusted admins can delete fee payments"
ON public.fee_payments
FOR DELETE
TO authenticated
USING (
  (SELECT public.is_admin())
);

-- ============================================================
-- 6. Revoke all direct browser table privileges
-- ============================================================

REVOKE ALL PRIVILEGES
ON TABLE public.fee_payments
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON TABLE public.fee_payments
FROM anon;

REVOKE ALL PRIVILEGES
ON TABLE public.fee_payments
FROM authenticated;

-- ============================================================
-- 7. Grant authenticated SELECT, INSERT, DELETE only
-- ============================================================

GRANT SELECT, INSERT, DELETE
ON TABLE public.fee_payments
TO authenticated;

-- ============================================================
-- 8. Preserve administrative access
-- ============================================================

GRANT ALL PRIVILEGES
ON TABLE public.fee_payments
TO service_role;

GRANT ALL PRIVILEGES
ON TABLE public.fee_payments
TO postgres;

COMMIT;
