-- Add payment_submission_id to fee_payments table for linking submissions to official payments
-- Add unique constraint to prevent duplicate fee_payments from the same submission

-- Add payment_submission_id column
ALTER TABLE fee_payments
ADD COLUMN IF NOT EXISTS payment_submission_id UUID REFERENCES payment_submissions(id) ON DELETE SET NULL;

-- Add unique constraint to prevent duplicate fee_payments from the same submission
ALTER TABLE fee_payments
ADD CONSTRAINT fee_payments_payment_submission_id_unique
UNIQUE (payment_submission_id);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_fee_payments_payment_submission ON fee_payments(payment_submission_id);
