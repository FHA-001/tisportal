-- ============================================================
-- TIS Auth Modernization - A3 hotfix
-- Fix bootstrap_portal_session to use custom_sessions.revoked_at
-- (the table does not have an is_revoked column).
-- ============================================================

BEGIN;

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

  -- Admins use Supabase Auth directly and do not need a compatibility token.
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

  -- Revoke any previous active compatibility sessions for this role/profile.
  UPDATE public.custom_sessions
  SET revoked_at = now()
  WHERE user_id = v_profile_id
    AND role = v_role
    AND revoked_at IS NULL;

  -- Generate the same 256-bit raw token style used by the existing login RPCs.
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
