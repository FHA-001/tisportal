-- Storage policies in Supabase are managed through the Dashboard or CLI
-- This migration file is a placeholder - actual policy management must be done via:

-- Option 1: Supabase Dashboard
-- Go to Storage > payment-proofs > Policies > New Policy
-- Set: Policy name = "Allow uploads", Allowed operations = INSERT, SELECT
-- Target roles = authenticated, Policy definition = true

-- Option 2: Supabase CLI
-- Run: supabase storage add-policy payment-proofs --name allow-uploads --allowed-operations INSERT,SELECT --definition true

-- Option 3: Direct SQL (if storage extension is properly installed)
-- Uncomment the following if storage.policies table exists:

-- DELETE FROM storage.policies 
-- WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'payment-proofs');

-- INSERT INTO storage.policies (name, bucket_id, definition, allowed_operations)
-- VALUES (
--   'payment-proofs-public-access',
--   (SELECT id FROM storage.buckets WHERE name = 'payment-proofs'),
--   'true',
--   ARRAY['INSERT', 'SELECT', 'UPDATE', 'DELETE']
-- );
