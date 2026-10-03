-- A8.5: Supabase Auth notification migration for Teacher, Accountant, Parent
-- Requires current_teacher_id(), current_accountant_id(), current_parent_id() from auth identity helpers.
-- Legacy custom-session notification RPCs remain for Student until later cleanup.
-- This adds new Supabase Auth overloads for Teacher, Accountant, Parent notifications.

BEGIN;

-- ============================================================
-- 1. Supabase Auth notification get for Teacher
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_teacher_notifications(
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
AS $$
DECLARE
  v_teacher_id uuid;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
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
  WHERE n.user_type = 'teacher'
    AND n.user_id = v_teacher_id
  ORDER BY n.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

-- ============================================================
-- 2. Supabase Auth notification get for Accountant
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_accountant_notifications(
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
AS $$
DECLARE
  v_accountant_id uuid;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
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
  WHERE n.user_type = 'accountant'
    AND n.user_id = v_accountant_id
  ORDER BY n.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

-- ============================================================
-- 3. Supabase Auth notification get for Parent
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_parent_notifications(
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
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
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
  WHERE n.user_type = 'parent'
    AND n.user_id = v_parent_id
  ORDER BY n.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
END;
$$;

-- ============================================================
-- 4. Supabase Auth mark notification read for Teacher
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_teacher_notification_read(
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_count integer;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.id = p_notification_id
    AND n.user_type = 'teacher'
    AND n.user_id = v_teacher_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_count > 0
  );
END;
$$;

-- ============================================================
-- 5. Supabase Auth mark notification read for Accountant
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_accountant_notification_read(
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accountant_id uuid;
  v_count integer;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.id = p_notification_id
    AND n.user_type = 'accountant'
    AND n.user_id = v_accountant_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_count > 0
  );
END;
$$;

-- ============================================================
-- 6. Supabase Auth mark notification read for Parent
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_parent_notification_read(
  p_notification_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_id uuid;
  v_count integer;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.id = p_notification_id
    AND n.user_type = 'parent'
    AND n.user_id = v_parent_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_count > 0
  );
END;
$$;

-- ============================================================
-- 7. Supabase Auth mark all notifications read for Teacher
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_all_teacher_notifications_read()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_teacher_id uuid;
  v_count integer;
BEGIN
  v_teacher_id := public.current_teacher_id();

  IF v_teacher_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.user_type = 'teacher'
    AND n.user_id = v_teacher_id
    AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_count
  );
END;
$$;

-- ============================================================
-- 8. Supabase Auth mark all notifications read for Accountant
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_all_accountant_notifications_read()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_accountant_id uuid;
  v_count integer;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.user_type = 'accountant'
    AND n.user_id = v_accountant_id
    AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_count
  );
END;
$$;

-- ============================================================
-- 9. Supabase Auth mark all notifications read for Parent
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_all_parent_notifications_read()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parent_id uuid;
  v_count integer;
BEGIN
  v_parent_id := public.current_parent_id();

  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.notifications AS n
  SET is_read = true
  WHERE n.user_type = 'parent'
    AND n.user_id = v_parent_id
    AND n.is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_count
  );
END;
$$;

-- ============================================================
-- 10. Set permissions for new Supabase Auth notification RPCs
-- ============================================================

-- Teacher notifications
REVOKE ALL ON FUNCTION public.get_teacher_notifications(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_notifications(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_notifications(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_notifications(integer) TO service_role;

REVOKE ALL ON FUNCTION public.mark_teacher_notification_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_teacher_notification_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_teacher_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_teacher_notification_read(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mark_all_teacher_notifications_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_teacher_notifications_read() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_all_teacher_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_teacher_notifications_read() TO service_role;

-- Accountant notifications
REVOKE ALL ON FUNCTION public.get_accountant_notifications(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_accountant_notifications(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_accountant_notifications(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accountant_notifications(integer) TO service_role;

REVOKE ALL ON FUNCTION public.mark_accountant_notification_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_accountant_notification_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_accountant_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_accountant_notification_read(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mark_all_accountant_notifications_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_accountant_notifications_read() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_all_accountant_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_accountant_notifications_read() TO service_role;

-- Parent notifications
REVOKE ALL ON FUNCTION public.get_parent_notifications(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_parent_notifications(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_parent_notifications(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_parent_notifications(integer) TO service_role;

REVOKE ALL ON FUNCTION public.mark_parent_notification_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_parent_notification_read(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_parent_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_parent_notification_read(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.mark_all_parent_notifications_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_parent_notifications_read() FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_all_parent_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_parent_notifications_read() TO service_role;

COMMIT;
