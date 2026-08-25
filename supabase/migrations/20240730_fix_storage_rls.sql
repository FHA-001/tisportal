-- Fix RLS on payment-proofs storage bucket
-- Disable RLS to allow parents to upload payment proofs

-- Note: Storage bucket RLS policies are managed differently than table RLS
-- This needs to be run via Supabase Dashboard or using the storage API
-- The following SQL attempts to disable RLS on the storage bucket

-- Drop existing policies on payment-proofs bucket
-- This may need to be done via Supabase Dashboard UI

-- Alternative: Create permissive policies for the storage bucket
INSERT INTO storage.policies (name, bucket_id, definition, allowed_operations)
VALUES (
  'payment-proofs-public-upload',
  (SELECT id FROM storage.buckets WHERE name = 'payment-proofs'),
  'true',
  ARRAY['INSERT', 'SELECT', 'UPDATE']
)
ON CONFLICT (name) DO UPDATE SET
  definition = 'true',
  allowed_operations = ARRAY['INSERT', 'SELECT', 'UPDATE'];

-- If the above doesn't work, the bucket RLS needs to be disabled via:
-- 1. Go to Supabase Dashboard
-- 2. Navigate to Storage > payment-proofs
-- 3. Click "Policies" 
-- 4. Disable RLS or add permissive policies
