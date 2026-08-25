-- RPC function to generate unique receipt numbers
-- Format: RCT-YYYY-000001
-- Uses advisory lock to prevent concurrent duplicates
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_year TEXT;
  v_max_number INTEGER;
  v_next_number INTEGER;
  v_receipt_number TEXT;
BEGIN
  -- Get current year
  v_current_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Acquire advisory lock to prevent concurrent receipt number generation
  PERFORM pg_advisory_xact_lock(hashtext('receipt_number_generation'));
  
  -- Find the highest receipt number for the current year
  SELECT MAX(SUBSTRING(receipt_number FROM 10)::INTEGER)
  INTO v_max_number
  FROM fee_payments
  WHERE receipt_number LIKE 'RCT-' || v_current_year || '-%';
  
  -- If no receipts exist for this year, start at 1
  IF v_max_number IS NULL THEN
    v_next_number := 1;
  ELSE
    v_next_number := v_max_number + 1;
  END IF;
  
  -- Format the receipt number with leading zeros
  v_receipt_number := 'RCT-' || v_current_year || '-' || LPAD(v_next_number::TEXT, 6, '0');
  
  -- Lock is automatically released when transaction ends
  
  RETURN v_receipt_number;
END;
$$;
