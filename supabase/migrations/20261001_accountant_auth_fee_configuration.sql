-- A8.3C: Accountant Fee Configuration migration to Supabase Auth
-- Requires public.current_accountant_id().
-- Legacy custom-session overloads are intentionally retained for A8.7 cleanup.

BEGIN;


-- ============================================================
-- 1. Accountant fee configuration read
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_accountant_fee_configuration()
RETURNS TABLE(
  class_id uuid,
  class_name text,
  class_tier text,
  class_level integer,
  fee_id uuid,
  fee_amount numeric,
  fee_academic_session_id uuid,
  academic_session_id uuid,
  academic_session_name text,
  current_term text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_accountant_id uuid;
  v_active_session record;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized accountant';
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
    c.id,
    c.name,
    c.tier,
    c.level,
    fee.id,
    COALESCE(fee.fee_amount, 0)::numeric,
    fee.academic_session_id,
    v_active_session.id,
    v_active_session.name,
    v_active_session.current_term
  FROM public.classes c

  LEFT JOIN LATERAL (
    SELECT
      sf.id,
      sf.fee_amount,
      sf.academic_session_id
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

  ORDER BY
    COALESCE(c.sort_order, 999999),
    c.name;
END;
$function$;


-- ============================================================
-- 2. Accountant fee configuration update
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_accountant_school_fee(
  p_class_id uuid,
  p_fee_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_accountant_id uuid;
  v_active_session record;
  v_class record;
  v_fee_id uuid;
BEGIN
  v_accountant_id := public.current_accountant_id();

  IF v_accountant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized'
    );
  END IF;

  IF p_fee_amount IS NULL OR p_fee_amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_fee_amount'
    );
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

  SELECT
    c.id,
    c.name
  INTO v_class
  FROM public.classes c
  WHERE c.id = p_class_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'class_not_found'
    );
  END IF;

  SELECT sf.id
  INTO v_fee_id
  FROM public.school_fees sf
  WHERE
    replace(lower(trim(sf.class_name)), ' ', '') =
    replace(lower(trim(v_class.name)), ' ', '')
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
  LIMIT 1;

  IF v_fee_id IS NOT NULL THEN

    UPDATE public.school_fees
    SET
      fee_amount = p_fee_amount,
      updated_at = now()
    WHERE id = v_fee_id;

  ELSE

    INSERT INTO public.school_fees (
      class_name,
      fee_amount,
      academic_session_id,
      created_at,
      updated_at
    )
    VALUES (
      v_class.name,
      p_fee_amount,
      NULL,
      now(),
      now()
    )
    RETURNING id INTO v_fee_id;

  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fee_id', v_fee_id,
    'class_id', v_class.id,
    'class_name', v_class.name,
    'fee_amount', p_fee_amount
  );
END;
$function$;


-- ============================================================
-- 3. Lock down new Supabase Auth overloads
-- ============================================================

REVOKE ALL
ON FUNCTION public.get_accountant_fee_configuration()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.get_accountant_fee_configuration()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.get_accountant_fee_configuration()
TO authenticated, service_role;


REVOKE ALL
ON FUNCTION public.update_accountant_school_fee(uuid, numeric)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.update_accountant_school_fee(uuid, numeric)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.update_accountant_school_fee(uuid, numeric)
TO authenticated, service_role;


COMMIT;