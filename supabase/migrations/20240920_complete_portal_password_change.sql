-- A5.3: Clear forced-password-change flag for migrated Supabase Auth roles.
-- Student custom authentication remains unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_portal_password_change()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_rows integer := 0;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  UPDATE public.teachers
  SET
    must_change_password = false,
    updated_at = now()
  WHERE auth_user_id = v_auth_user_id
    AND role IN ('teacher', 'accountant');

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  UPDATE public.parents
  SET
    must_change_password = false,
    updated_at = now()
  WHERE auth_user_id = v_auth_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows > 0 THEN
    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object('error', 'portal_profile_not_found');
END;
$$;

REVOKE ALL ON FUNCTION public.complete_portal_password_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_portal_password_change() FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_portal_password_change() TO authenticated;

COMMIT;
