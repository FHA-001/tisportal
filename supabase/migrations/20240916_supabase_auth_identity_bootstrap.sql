-- ============================================================
-- TIS Auth Modernization - A3A
-- Supabase Auth identity resolution + temporary compatibility
-- custom-session bootstrap for Teacher / Accountant / Parent.
--
-- WHY THIS EXISTS:
--   Login credentials move to Supabase Auth immediately, while the
--   existing application RPCs can continue using their validated
--   custom session tokens during the staged migration.
--
-- STUDENTS:
--   Unchanged. They continue using login_student + custom_sessions.
--
-- ADMINS:
--   Unchanged. They continue using Supabase Auth + public.is_admin().
--
-- IMPORTANT:
--   This migration does not change existing login functions or RLS.
--   It is safe to apply before the frontend switch.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Resolve the signed-in Supabase Auth user to a portal identity.
--    Role is derived only from trusted database relationships.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_portal_identity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_auth_user_id uuid := auth.uid();
  v_teacher record;
  v_parent record;
BEGIN
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'authenticated', false,
      'role', null,
      'profile_id', null
    );
  END IF;

  -- Trusted Admin registry takes precedence.
  IF public.is_admin() THEN
    RETURN jsonb_build_object(
      'authenticated', true,
      'role', 'admin',
      'profile_id', v_auth_user_id,
      'auth_user_id', v_auth_user_id
    );
  END IF;

  -- Teacher / Accountant profile linked to this Auth user.
  SELECT
    t.id,
    t.full_name,
    t.email,
    t.role,
    t.is_active,
    t.must_change_password
  INTO v_teacher
  FROM public.teachers t
  WHERE t.auth_user_id = v_auth_user_id
  LIMIT 1;

  IF FOUND THEN
    IF COALESCE(v_teacher.is_active, false) = false THEN
      RETURN jsonb_build_object(
        'authenticated', true,
        'role', v_teacher.role,
        'profile_id', v_teacher.id,
        'auth_user_id', v_auth_user_id,
        'is_active', false,
        'error', 'inactive'
      );
    END IF;

    RETURN jsonb_build_object(
      'authenticated', true,
      'role', v_teacher.role,
      'profile_id', v_teacher.id,
      'auth_user_id', v_auth_user_id,
      'full_name', v_teacher.full_name,
      'email', v_teacher.email,
      'is_active', true,
      'must_change_password', COALESCE(v_teacher.must_change_password, false)
    );
  END IF;

  -- Parent profile linked to this Auth user.
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.is_active,
    p.must_change_password
  INTO v_parent
  FROM public.parents p
  WHERE p.auth_user_id = v_auth_user_id
  LIMIT 1;

  IF FOUND THEN
    IF COALESCE(v_parent.is_active, true) = false THEN
      RETURN jsonb_build_object(
        'authenticated', true,
        'role', 'parent',
        'profile_id', v_parent.id,
        'auth_user_id', v_auth_user_id,
        'is_active', false,
        'error', 'inactive'
      );
    END IF;

    RETURN jsonb_build_object(
      'authenticated', true,
      'role', 'parent',
      'profile_id', v_parent.id,
      'auth_user_id', v_auth_user_id,
      'full_name', v_parent.full_name,
      'email', v_parent.email,
      'is_active', true,
      'must_change_password', COALESCE(v_parent.must_change_password, false)
    );
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'role', null,
    'profile_id', null,
    'auth_user_id', v_auth_user_id,
    'error', 'portal_profile_not_found'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_portal_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portal_identity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_portal_identity() TO service_role;


-- ------------------------------------------------------------
-- 2. Bootstrap a temporary compatibility custom-session token.
--
--    Credentials are already authenticated by Supabase Auth.
--    This function derives the portal profile from auth.uid() and
--    creates the same kind of server-validated token expected by
--    the existing Teacher/Accountant/Parent RPCs.
--
--    This is transitional and can be removed after all migrated
--    role RPCs authorize directly with auth.uid().
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_portal_session()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_identity jsonb;
  v_role text;
  v_profile_id uuid;
  v_token text;
  v_token_hash text;
  v_expires_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_identity := public.get_portal_identity();
  v_role := v_identity->>'role';

  IF COALESCE(v_identity->>'error', '') <> '' THEN
    RETURN jsonb_build_object(
      'error', v_identity->>'error',
      'role', v_role
    );
  END IF;

  -- Admins do not use compatibility custom sessions.
  IF v_role = 'admin' THEN
    RETURN jsonb_build_object(
      'success', true,
      'role', 'admin',
      'uses_custom_session', false
    );
  END IF;

  IF v_role NOT IN ('teacher', 'accountant', 'parent') THEN
    RETURN jsonb_build_object('error', 'unsupported_role');
  END IF;

  v_profile_id := (v_identity->>'profile_id')::uuid;

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('error', 'portal_profile_not_found');
  END IF;

  -- Revoke old compatibility sessions for this migrated role/profile
  -- so one fresh login starts from a clean server-side session state.
  UPDATE public.custom_sessions
  SET is_revoked = true
  WHERE user_id = v_profile_id
    AND role = v_role
    AND COALESCE(is_revoked, false) = false;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_expires_at := now() + interval '30 minutes';

  INSERT INTO public.custom_sessions (
    token_hash,
    user_id,
    role,
    expires_at
  )
  VALUES (
    v_token_hash,
    v_profile_id,
    v_role,
    v_expires_at
  );

  RETURN jsonb_build_object(
    'success', true,
    'role', v_role,
    'id', v_profile_id,
    'full_name', v_identity->>'full_name',
    'email', v_identity->>'email',
    'must_change_password',
      COALESCE((v_identity->>'must_change_password')::boolean, false),
    'session_token', v_token,
    'expires_at', v_expires_at,
    'uses_custom_session', true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.bootstrap_portal_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_portal_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_portal_session() TO service_role;

COMMIT;
