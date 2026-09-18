-- ============================================================
-- TIS PORTAL — BATCH 1 SECURITY HARDENING
-- parents + school_account_details + payment_accounts
-- ============================================================
-- Goals:
-- 1. Remove direct anon access to parent personal data.
-- 2. Make school account details parent-readable only through a
--    validated custom-session RPC, while preserving trusted Admin CRUD.
-- 3. Keep payment-account SELECT public (intended payment destination
--    display) but restrict all writes to trusted Admin only.
-- 4. Preserve service_role access.
--
-- Manual Supabase execution required.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- A. PARENTS
-- ------------------------------------------------------------

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete parents" ON public.parents;
DROP POLICY IF EXISTS "Admins can insert parents" ON public.parents;
DROP POLICY IF EXISTS "Admins can update parents" ON public.parents;
DROP POLICY IF EXISTS "Admins can view all parents" ON public.parents;
DROP POLICY IF EXISTS "Parents can view own profile" ON public.parents;

CREATE POLICY parents_admin_select
ON public.parents
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY parents_admin_insert
ON public.parents
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY parents_admin_update
ON public.parents
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY parents_admin_delete
ON public.parents
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.parents FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.parents FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.parents FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.parents TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.parents TO service_role;

-- ------------------------------------------------------------
-- B. SCHOOL ACCOUNT DETAILS
-- ------------------------------------------------------------

ALTER TABLE public.school_account_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can delete school_account_details" ON public.school_account_details;
DROP POLICY IF EXISTS "Admins can insert school_account_details" ON public.school_account_details;
DROP POLICY IF EXISTS "Admins can update school_account_details" ON public.school_account_details;
DROP POLICY IF EXISTS "Admins can view school_account_details" ON public.school_account_details;
DROP POLICY IF EXISTS "Parents can view school_account_details" ON public.school_account_details;

CREATE POLICY school_account_details_admin_select
ON public.school_account_details
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY school_account_details_admin_insert
ON public.school_account_details
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY school_account_details_admin_update
ON public.school_account_details
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY school_account_details_admin_delete
ON public.school_account_details
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.school_account_details FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.school_account_details FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.school_account_details FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.school_account_details TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.school_account_details TO service_role;

CREATE OR REPLACE FUNCTION public.get_parent_school_account_details(
  p_session_token text
)
RETURNS TABLE (
  id uuid,
  bank_name text,
  account_number text,
  account_name text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session RECORD;
BEGIN
  IF p_session_token IS NULL OR btrim(p_session_token) = '' THEN
    RAISE EXCEPTION 'Invalid session token';
  END IF;

  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'parent')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid parent session';
  END IF;

  RETURN QUERY
  SELECT
    sad.id,
    sad.bank_name,
    sad.account_number,
    sad.account_name,
    sad.is_active,
    sad.created_at,
    sad.updated_at
  FROM public.school_account_details AS sad
  WHERE sad.is_active = true
  ORDER BY sad.updated_at DESC NULLS LAST, sad.created_at DESC NULLS LAST
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_parent_school_account_details(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_parent_school_account_details(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_school_account_details(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_school_account_details(text) TO service_role;

-- ------------------------------------------------------------
-- C. PAYMENT ACCOUNTS
-- ------------------------------------------------------------
-- These are intended payment-destination details, so SELECT remains
-- readable by public/anon/custom-session clients. Writes are Admin-only.

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view payment accounts" ON public.payment_accounts;
DROP POLICY IF EXISTS "Authenticated users can delete payment accounts" ON public.payment_accounts;
DROP POLICY IF EXISTS "Authenticated users can insert payment accounts" ON public.payment_accounts;
DROP POLICY IF EXISTS "Authenticated users can update payment accounts" ON public.payment_accounts;

CREATE POLICY payment_accounts_public_select
ON public.payment_accounts
FOR SELECT
TO public
USING (true);

CREATE POLICY payment_accounts_admin_insert
ON public.payment_accounts
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY payment_accounts_admin_update
ON public.payment_accounts
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY payment_accounts_admin_delete
ON public.payment_accounts
FOR DELETE
TO authenticated
USING (public.is_admin());

REVOKE ALL PRIVILEGES ON TABLE public.payment_accounts FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.payment_accounts FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.payment_accounts FROM authenticated;

GRANT SELECT ON TABLE public.payment_accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_accounts TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.payment_accounts TO service_role;

COMMIT;
