-- Add receipt_number column to fee_payments table
-- This stores the unique receipt number for each approved payment

ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- Add index for efficient querying by receipt number
CREATE INDEX IF NOT EXISTS idx_fee_payments_receipt_number ON fee_payments(receipt_number);
