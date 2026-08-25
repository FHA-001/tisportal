-- Complete removal of accountant feature from database
-- This removes all accountant-related tables, functions, and policies

-- Drop payment_proofs table
DROP TABLE IF EXISTS payment_proofs CASCADE;

-- Drop accountants table
DROP TABLE IF EXISTS accountants CASCADE;

-- Drop RPC functions
DROP FUNCTION IF EXISTS login_accountant CASCADE;
DROP FUNCTION IF EXISTS approve_payment_proof CASCADE;
DROP FUNCTION IF EXISTS reject_payment_proof CASCADE;

-- Revoke storage permissions
REVOKE ALL ON storage.buckets FROM authenticated;
REVOKE ALL ON storage.objects FROM authenticated;
REVOKE USAGE ON SCHEMA storage FROM authenticated;

-- Revert RLS policies to original state
-- Re-enable RLS on students and remove added policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view students" ON students;
DROP POLICY IF EXISTS "Parents can view their children" ON students;

-- Re-enable RLS on parents
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on school_fees
ALTER TABLE school_fees ENABLE ROW LEVEL SECURITY;

-- Note: The payment-proofs storage bucket needs to be removed via Supabase Dashboard
-- as direct SQL deletion is not allowed by Supabase
