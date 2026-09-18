-- ============================================================
-- TIS PORTAL — NOTIFICATION EVENT AUTOMATION (CORRECTED)
-- Depends on: 20240909_notification_system_foundation.sql
--
-- Live-schema aligned for:
--   academic_sessions.is_active + current_term
--   announcements.is_active + target_audience
--   newsletters.is_published
--   students.status / is_active
--   teachers.role / is_active
--   homework.class_id
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. ANNOUNCEMENTS -> relevant roles
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_announcement_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_target text := lower(COALESCE(NEW.target_audience, 'all'));
  v_title text := COALESCE(NULLIF(btrim(NEW.title), ''), 'New Announcement');
  v_message text;
BEGIN
  -- Notify only when initially active, or when an inactive announcement
  -- is later activated. Ordinary edits must not create duplicate alerts.
  IF COALESCE(NEW.is_active, true) = false THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_active, true) = true THEN
    RETURN NEW;
  END IF;

  v_message := 'A new school announcement has been posted: ' || v_title;

  IF v_target IN ('all', 'student', 'students') THEN
    INSERT INTO public.notifications (user_type, user_id, title, message, type)
    SELECT 'student', s.id, 'New Announcement', v_message, 'announcement'
    FROM public.students s
    WHERE COALESCE(s.is_active, false) = true;
  END IF;

  IF v_target IN ('all', 'teacher', 'teachers', 'staff') THEN
    INSERT INTO public.notifications (user_type, user_id, title, message, type)
    SELECT 'teacher', t.id, 'New Announcement', v_message, 'announcement'
    FROM public.teachers t
    WHERE t.is_active = true
      AND t.role = 'teacher';
  END IF;

  IF v_target IN ('all', 'accountant', 'accountants', 'staff') THEN
    INSERT INTO public.notifications (user_type, user_id, title, message, type)
    SELECT 'accountant', t.id, 'New Announcement', v_message, 'announcement'
    FROM public.teachers t
    WHERE t.is_active = true
      AND t.role = 'accountant';
  END IF;

  IF v_target IN ('all', 'parent', 'parents') THEN
    INSERT INTO public.notifications (user_type, user_id, title, message, type)
    SELECT 'parent', p.id, 'New Announcement', v_message, 'announcement'
    FROM public.parents p
    WHERE COALESCE(p.is_active, true) = true;
  END IF;

  IF v_target IN ('admin', 'admins') THEN
    INSERT INTO public.notifications (user_type, user_id, title, message, type)
    SELECT 'admin', au.user_id, 'New Announcement', v_message, 'announcement'
    FROM app_private.admin_users au;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_announcement_event_trigger ON public.announcements;
CREATE TRIGGER notify_announcement_event_trigger
AFTER INSERT OR UPDATE OF is_active
ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_announcement_event();

REVOKE EXECUTE ON FUNCTION public.notify_announcement_event()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_announcement_event()
TO service_role;

-- ------------------------------------------------------------
-- 2. NEWSLETTERS -> Student, Parent, Teacher, Accountant
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_newsletter_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_title text := COALESCE(NULLIF(btrim(NEW.title::text), ''), 'School Newsletter');
  v_message text;
BEGIN
  IF COALESCE(NEW.is_published, false) = false THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.is_published, false) = true THEN
    RETURN NEW;
  END IF;

  v_message := 'A new school newsletter is available: ' || v_title;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT 'student', s.id, 'New Newsletter', v_message, 'newsletter'
  FROM public.students s
  WHERE COALESCE(s.is_active, false) = true;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT 'parent', p.id, 'New Newsletter', v_message, 'newsletter'
  FROM public.parents p
  WHERE COALESCE(p.is_active, true) = true;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT
    CASE WHEN t.role = 'accountant' THEN 'accountant' ELSE 'teacher' END,
    t.id,
    'New Newsletter',
    v_message,
    'newsletter'
  FROM public.teachers t
  WHERE t.is_active = true
    AND t.role IN ('teacher', 'accountant');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_newsletter_event_trigger ON public.newsletters;
CREATE TRIGGER notify_newsletter_event_trigger
AFTER INSERT OR UPDATE OF is_published
ON public.newsletters
FOR EACH ROW
EXECUTE FUNCTION public.notify_newsletter_event();

REVOKE EXECUTE ON FUNCTION public.notify_newsletter_event()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_newsletter_event()
TO service_role;

-- ------------------------------------------------------------
-- 3. ACTIVE ACADEMIC SESSION / TERM UPDATE
--    Notify when:
--      a) an active session is inserted;
--      b) inactive -> active;
--      c) current_term changes while active.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_academic_session_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_message text;
BEGIN
  IF COALESCE(NEW.is_active, false) = false THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND COALESCE(OLD.is_active, false) = true
     AND OLD.current_term IS NOT DISTINCT FROM NEW.current_term THEN
    RETURN NEW;
  END IF;

  IF NEW.current_term IS NOT NULL AND btrim(NEW.current_term) <> '' THEN
    v_message :=
      COALESCE(NULLIF(btrim(NEW.name), ''), 'The academic session') ||
      ' is active. Current term: ' || NEW.current_term || '.';
  ELSE
    v_message :=
      COALESCE(NULLIF(btrim(NEW.name), ''), 'A new academic session') ||
      ' is now active.';
  END IF;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT 'student', s.id, 'Academic Session Update', v_message, 'session'
  FROM public.students s
  WHERE COALESCE(s.is_active, false) = true;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT 'parent', p.id, 'Academic Session Update', v_message, 'session'
  FROM public.parents p
  WHERE COALESCE(p.is_active, true) = true;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT
    CASE WHEN t.role = 'accountant' THEN 'accountant' ELSE 'teacher' END,
    t.id,
    'Academic Session Update',
    v_message,
    'session'
  FROM public.teachers t
  WHERE t.is_active = true
    AND t.role IN ('teacher', 'accountant');

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_academic_session_event_trigger ON public.academic_sessions;
CREATE TRIGGER notify_academic_session_event_trigger
AFTER INSERT OR UPDATE OF is_active, current_term
ON public.academic_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_academic_session_event();

REVOKE EXECUTE ON FUNCTION public.notify_academic_session_event()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_academic_session_event()
TO service_role;

-- ------------------------------------------------------------
-- 4. PENDING STUDENT SELF-SIGNUP -> Admin
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_pending_signup_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_status text := lower(COALESCE(NEW.status, ''));
  v_name text := COALESCE(NULLIF(btrim(NEW.full_name), ''), 'A student');
BEGIN
  -- Admin-created normal students default to Active and therefore do not alert.
  IF v_status <> 'pending' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT
    'admin',
    au.user_id,
    'New Signup Request',
    v_name || ' submitted a student signup request and is awaiting approval.',
    'signup'
  FROM app_private.admin_users au;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_pending_signup_event_trigger ON public.students;
CREATE TRIGGER notify_pending_signup_event_trigger
AFTER INSERT
ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.notify_pending_signup_event();

REVOKE EXECUTE ON FUNCTION public.notify_pending_signup_event()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_pending_signup_event()
TO service_role;

-- ------------------------------------------------------------
-- 5. NEW HOMEWORK -> active Students in affected class
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_homework_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_message text;
BEGIN
  v_message := 'New homework has been posted: ' || NEW.title ||
               '. Due: ' || NEW.due_date::text;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT 'student', s.id, 'New Homework', v_message, 'homework'
  FROM public.students s
  WHERE s.class_id = NEW.class_id
    AND COALESCE(s.is_active, false) = true;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_homework_event_trigger ON public.homework;
CREATE TRIGGER notify_homework_event_trigger
AFTER INSERT
ON public.homework
FOR EACH ROW
EXECUTE FUNCTION public.notify_homework_event();

REVOKE EXECUTE ON FUNCTION public.notify_homework_event()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_homework_event()
TO service_role;

-- ------------------------------------------------------------
-- 6. RESULTS POSTED / RELEASED
-- Admin explicitly calls this when a class's results are ready.
-- Does not change grade visibility or modify grades.
-- Notifies active Students, linked active Parents and Teachers assigned
-- to that class.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_results_posted(
  p_class_id uuid,
  p_term text,
  p_session text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_class_name text;
  v_student_count integer := 0;
  v_parent_count integer := 0;
  v_teacher_count integer := 0;
  v_message text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF p_class_id IS NULL
     OR NULLIF(btrim(p_term), '') IS NULL
     OR NULLIF(btrim(p_session), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_required_fields');
  END IF;

  SELECT c.name
  INTO v_class_name
  FROM public.classes c
  WHERE c.id = p_class_id;

  IF v_class_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'class_not_found');
  END IF;

  v_message :=
    btrim(p_term) || ' results for ' || v_class_name ||
    ' (' || btrim(p_session) ||
    ') have been posted. You can now view the results in the portal.';

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT 'student', s.id, 'Results Posted', v_message, 'result'
  FROM public.students s
  WHERE s.class_id = p_class_id
    AND COALESCE(s.is_active, false) = true;
  GET DIAGNOSTICS v_student_count = ROW_COUNT;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT DISTINCT
    'parent',
    ps.parent_id,
    'Results Posted',
    v_message,
    'result'
  FROM public.parent_students ps
  JOIN public.students s ON s.id = ps.student_id
  JOIN public.parents p ON p.id = ps.parent_id
  WHERE s.class_id = p_class_id
    AND COALESCE(s.is_active, false) = true
    AND COALESCE(p.is_active, true) = true;
  GET DIAGNOSTICS v_parent_count = ROW_COUNT;

  INSERT INTO public.notifications (user_type, user_id, title, message, type)
  SELECT DISTINCT
    'teacher',
    t.id,
    'Results Released',
    btrim(p_term) || ' results for ' || v_class_name ||
      ' (' || btrim(p_session) || ') have been released.',
    'result'
  FROM public.class_subjects cs
  JOIN public.teachers t ON t.id = cs.teacher_id
  WHERE cs.class_id = p_class_id
    AND t.is_active = true
    AND t.role = 'teacher';
  GET DIAGNOSTICS v_teacher_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'student_notifications', v_student_count,
    'parent_notifications', v_parent_count,
    'teacher_notifications', v_teacher_count,
    'class_name', v_class_name,
    'term', btrim(p_term),
    'session', btrim(p_session)
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_results_posted(uuid, text, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.notify_results_posted(uuid, text, text)
TO authenticated, service_role;

COMMIT;
