-- Disable RLS on tables related to payment_submissions
-- This prevents RLS errors during foreign key validation

ALTER TABLE payment_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE parents DISABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions DISABLE ROW LEVEL SECURITY;
