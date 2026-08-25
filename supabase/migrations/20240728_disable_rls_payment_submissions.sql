-- Disable RLS on payment_submissions table
-- RLS policies will be implemented in a dedicated security phase after the feature is fully working
ALTER TABLE payment_submissions DISABLE ROW LEVEL SECURITY;
