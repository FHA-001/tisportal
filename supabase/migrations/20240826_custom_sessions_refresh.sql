BEGIN;

-- Phase 1.5: Session Refresh Mechanism
-- This migration adds a throttled session refresh RPC to keep server-side
-- session expiry synchronized with browser inactivity behavior

CREATE OR REPLACE FUNCTION public.refresh_custom_session(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_rows_updated INTEGER;
BEGIN
  -- Reject NULL or empty tokens
  IF p_token IS NULL OR p_token = '' THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  
  -- Hash the provided token using SHA-256
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  
  -- Update only if session is currently valid and not revoked
  UPDATE public.custom_sessions
  SET 
    last_seen_at = NOW(),
    expires_at = NOW() + INTERVAL '30 minutes'
  WHERE token_hash = v_token_hash
    AND expires_at > NOW()
    AND revoked_at IS NULL;
  
  -- Return success only if a row was actually updated
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false);
  END IF;
END;
$$;

-- Revoke from PUBLIC, grant to anon for custom-auth frontend access
REVOKE EXECUTE ON FUNCTION public.refresh_custom_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_custom_session(TEXT) TO anon;

COMMIT;
