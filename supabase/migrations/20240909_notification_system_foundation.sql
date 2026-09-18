-- ============================================================
-- TIS PORTAL — NOTIFICATION SYSTEM FOUNDATION
-- Creates the missing notifications table and secure read/update RPCs
-- for Admin, Teacher, Accountant, Student and Parent.
--
-- Manual Supabase execution required.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type text NOT NULL
    CHECK (user_type IN ('admin', 'teacher', 'accountant', 'student', 'parent')),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  related_submission_id uuid NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_lookup_idx
  ON public.notifications (user_type, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_lookup_idx
  ON public.notifications (user_type, user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_type text,
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_related_submission_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_notification_id uuid;
BEGIN
  IF p_user_type NOT IN ('admin', 'teacher', 'accountant', 'student', 'parent') THEN
    RETURN jsonb_build_object(
      'success', false,
      'notification_id', NULL::uuid,
      'error', 'invalid_user_type'
    );
  END IF;

  IF p_user_id IS NULL
     OR NULLIF(btrim(p_title), '') IS NULL
     OR NULLIF(btrim(p_message), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'notification_id', NULL::uuid,
      'error', 'invalid_notification'
    );
  END IF;

  INSERT INTO public.notifications (
    user_type,
    user_id,
    title,
    message,
    type,
    related_submission_id
  )
  VALUES (
    p_user_type,
    p_user_id,
    btrim(p_title),
    btrim(p_message),
    COALESCE(NULLIF(btrim(p_type), ''), 'general'),
    p_related_submission_id
  )
  RETURNING id INTO v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id,
    'error', NULL::text
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'notification_id', NULL::uuid,
      'error', SQLERRM
    );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_notification(
  text, uuid, text, text, text, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_notification(
  text, uuid, text, text, text, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.get_custom_notifications(
  p_session_token text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  related_submission_id uuid,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  SELECT v.user_id, v.role
  INTO v_user_id, v_role
  FROM public.validate_custom_session(p_session_token, NULL) AS v
  WHERE v.is_valid = true
  LIMIT 1;

  IF v_user_id IS NULL OR v_role NOT IN ('teacher','accountant','student','parent') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.message,
    n.type,
    n.related_submission_id,
    n.is_read,
    n.created_at
  FROM public.notifications AS n
  WHERE n.user_type = v_role
    AND n.user_id = v_user_id
  ORDER BY n.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_custom_notification_read(
  p_session_token text,
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
  v_role text;
  v_count integer;
BEGIN
  SELECT v.user_id, v.role
  INTO v_user_id, v_role
  FROM public.validate_custom_session(p_session_token, NULL) AS v
  WHERE v.is_valid = true
  LIMIT 1;

  IF v_user_id IS NULL OR v_role NOT IN ('teacher','accountant','student','parent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_session');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.id = p_notification_id
    AND n.user_type = v_role
    AND n.user_id = v_user_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_count > 0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_custom_notifications_read(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid;
  v_role text;
  v_count integer;
BEGIN
  SELECT v.user_id, v.role
  INTO v_user_id, v_role
  FROM public.validate_custom_session(p_session_token, NULL) AS v
  WHERE v.is_valid = true
  LIMIT 1;

  IF v_user_id IS NULL OR v_role NOT IN ('teacher','accountant','student','parent') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_session');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.user_type = v_role
    AND n.user_id = v_user_id
    AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_count
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_custom_notifications(text, integer)
  FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_custom_notification_read(text, uuid)
  FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_all_custom_notifications_read(text)
  FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.get_custom_notifications(text, integer)
  TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.mark_custom_notification_read(text, uuid)
  TO anon, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_custom_notifications_read(text)
  TO anon, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_notifications(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  message text,
  type text,
  related_submission_id uuid,
  is_read boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_admin_id uuid;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.message,
    n.type,
    n.related_submission_id,
    n.is_read,
    n.created_at
  FROM public.notifications AS n
  WHERE n.user_type = 'admin'
    AND n.user_id = v_admin_id
  ORDER BY n.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_admin_notification_read(
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_admin_id uuid;
  v_count integer;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.id = p_notification_id
    AND n.user_type = 'admin'
    AND n.user_id = v_admin_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_count > 0
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_admin_notifications_read()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_admin_id uuid;
  v_count integer;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.user_type = 'admin'
    AND n.user_id = v_admin_id
    AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_count
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_admin_notifications(integer)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_admin_notification_read(uuid)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_admin_notifications_read()
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_admin_notifications(integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_admin_notification_read(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_admin_notifications_read()
  TO authenticated, service_role;

COMMIT;
