-- Phase 2A: Accountant class fee overview
-- Secure custom-session RPCs for read-only class/student fee visibility.
-- Apply manually in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_accountant_classes_fee_summary(
  p_session_token text
)
RETURNS TABLE(
  class_id uuid,
  class_name text,
  class_tier text,
  class_level integer,
  fee_amount numeric,
  active_student_count bigint,
  academic_session_id uuid,
  academic_session_name text,
  current_term text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_session record;
  v_active_session record;
BEGIN
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(p_session_token, 'accountant')
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid accountant session';
  END IF;

  SELECT
    s.id,
    s.name,
    s.current_term
  INTO v_active_session
  FROM public.academic_sessions s
  WHERE s.is_active = true
  ORDER BY
    s.updated_at DESC NULLS LAST,
    s.created_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    c.id AS class_id,
    c.name AS class_name,
    c.tier AS class_tier,
    c.level AS class_level,
    COALESCE(fee.fee_amount, 0)::numeric AS fee_amount,
    COUNT(st.id) FILTER (
      WHERE COALESCE(st.is_active, true) = true
    ) AS active_student_count,
    v_active_session.id AS academic_session_id,
    v_active_session.name AS academic_session_name,
    v_active_session.current_term AS current_term
  FROM public.classes c

  LEFT JOIN LATERAL (
    SELECT
      sf.fee_amount
    FROM public.school_fees sf
    WHERE
      replace(lower(trim(sf.class_name)), ' ', '') =
      replace(lower(trim(c.name)), ' ', '')
      AND (
        sf.academic_session_id = v_active_session.id
        OR sf.academic_session_id IS NULL
      )
    ORDER BY
      CASE
        WHEN sf.academic_session_id = v_active_session.id THEN 0
        ELSE 1
      END,
      sf.updated_at DESC NULLS LAST,
      sf.created_at DESC
    LIMIT 1
  ) fee ON true

  LEFT JOIN public.students st
    ON st.class_id = c.id

  GROUP BY
    c.id,
    c.name,
    c.tier,
    c.level,
    fee.fee_amount,
    v_active_session.id,
    v_active_session.name,
    v_active_session.current_term

  ORDER BY
    COALESCE(c.sort_order, 999999),
    c.name;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_accountant_class_fee_overview(
  p_session_token text,
  p_class_id uuid
)
RETURNS TABLE(
  student_id uuid,
  full_name text,
  admission_number text,
  student_status text,
  is_active boolean,
  class_id uuid,
  class_name text,
  configured_fee numeric,
  amount_paid numeric,
  balance numeric,
  fee_status text,
  academic_session_id uuid,
  academic_session_name text,
  current_term text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_session record;
  v_active_session record;
BEGIN
  SELECT *
  INTO v_session
  FROM public.validate_custom_session(
    p_session_token,
    'accountant'
  )
  WHERE is_valid = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid accountant session';
  END IF;

  SELECT
    s.id,
    s.name,
    s.current_term
  INTO v_active_session
  FROM public.academic_sessions s
  WHERE s.is_active = true
  ORDER BY
    s.updated_at DESC NULLS LAST,
    s.created_at DESC
  LIMIT 1;

  IF v_active_session.id IS NULL THEN
    RAISE EXCEPTION 'No active academic session is configured';
  END IF;

  RETURN QUERY
  WITH selected_class AS (
    SELECT
      c.id,
      c.name
    FROM public.classes c
    WHERE c.id = p_class_id
  ),

  fee_config AS (
    SELECT
      COALESCE(sf.fee_amount, 0)::numeric AS fee_amount
    FROM selected_class c

    LEFT JOIN LATERAL (
      SELECT
        sf2.fee_amount
      FROM public.school_fees sf2
      WHERE
        replace(lower(trim(sf2.class_name)), ' ', '') =
        replace(lower(trim(c.name)), ' ', '')
        AND (
          sf2.academic_session_id = v_active_session.id
          OR sf2.academic_session_id IS NULL
        )
      ORDER BY
        CASE
          WHEN sf2.academic_session_id = v_active_session.id THEN 0
          ELSE 1
        END,
        sf2.updated_at DESC NULLS LAST,
        sf2.created_at DESC
      LIMIT 1
    ) sf ON true
  ),

  payment_totals AS (
    SELECT
      fp.student_id,
      COALESCE(SUM(fp.amount), 0)::numeric AS amount_paid
    FROM public.fee_payments fp
    WHERE fp.term_id = v_active_session.id
    GROUP BY fp.student_id
  )

  SELECT
    st.id AS student_id,
    st.full_name,
    st.admission_number,
    st.status AS student_status,
    st.is_active,
    c.id AS class_id,
    c.name AS class_name,
    COALESCE(fc.fee_amount, 0)::numeric AS configured_fee,
    COALESCE(pt.amount_paid, 0)::numeric AS amount_paid,

    GREATEST(
      COALESCE(fc.fee_amount, 0) -
      COALESCE(pt.amount_paid, 0),
      0
    )::numeric AS balance,

    CASE
      WHEN COALESCE(fc.fee_amount, 0) <= 0 THEN
        'not_configured'

      WHEN COALESCE(pt.amount_paid, 0) >=
           COALESCE(fc.fee_amount, 0) THEN
        'paid'

      WHEN COALESCE(pt.amount_paid, 0) > 0 THEN
        'partially_paid'

      ELSE
        'unpaid'
    END::text AS fee_status,

    v_active_session.id AS academic_session_id,
    v_active_session.name AS academic_session_name,
    v_active_session.current_term AS current_term

  FROM public.students st

  JOIN selected_class c
    ON c.id = st.class_id

  CROSS JOIN fee_config fc

  LEFT JOIN payment_totals pt
    ON pt.student_id = st.id

  WHERE COALESCE(st.is_active, true) = true

  ORDER BY st.full_name;
END;
$function$;


REVOKE ALL
ON FUNCTION public.get_accountant_classes_fee_summary(text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_accountant_class_fee_overview(text, uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.get_accountant_classes_fee_summary(text)
TO anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.get_accountant_class_fee_overview(text, uuid)
TO anon, authenticated, service_role;