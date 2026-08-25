-- Create payment_submissions table for fee payment proof workflow
-- This table stores payment submissions from parents for accountant review

CREATE TABLE IF NOT EXISTS payment_submissions (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- References to existing tables
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  academic_session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(15, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference TEXT,
  payment_method TEXT NOT NULL,
  bank_name TEXT,
  
  -- Proof and review fields
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  accountant_remarks TEXT,
  reviewed_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add check constraint for status field
ALTER TABLE payment_submissions
ADD CONSTRAINT payment_submissions_status_check
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create indexes for efficient querying
CREATE INDEX idx_payment_submissions_student ON payment_submissions(student_id);
CREATE INDEX idx_payment_submissions_parent ON payment_submissions(parent_id);
CREATE INDEX idx_payment_submissions_academic_session ON payment_submissions(academic_session_id);
CREATE INDEX idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX idx_payment_submissions_reviewed_by ON payment_submissions(reviewed_by);
CREATE INDEX idx_payment_submissions_created_at ON payment_submissions(created_at DESC);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_submissions_updated_at
BEFORE UPDATE ON payment_submissions
FOR EACH ROW
EXECUTE FUNCTION update_payment_submissions_updated_at();
