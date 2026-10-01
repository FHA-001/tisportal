-- A8.3A follow-up: restore authenticated Parent payment submission flow
-- Discovered during Accountant Payment Review end-to-end verification.
-- Parents may upload payment proofs and submit payments only for themselves
-- and students linked to them through parent_students.

BEGIN;

DROP POLICY IF EXISTS "payment_proofs_authenticated_insert"
ON storage.objects;

CREATE POLICY "payment_proofs_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND name IS NOT NULL
  AND name <> ''
  AND public.current_parent_id() IS NOT NULL
);

DROP POLICY IF EXISTS "payment_proofs_authenticated_select"
ON storage.objects;

CREATE POLICY "payment_proofs_authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.current_parent_id() IS NOT NULL
);

DROP POLICY IF EXISTS "payment_proofs_authenticated_delete"
ON storage.objects;

CREATE POLICY "payment_proofs_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.current_parent_id() IS NOT NULL
);

GRANT INSERT ON TABLE public.payment_submissions TO authenticated;

DROP POLICY IF EXISTS "Parents can insert own payment submissions"
ON public.payment_submissions;

CREATE POLICY "Parents can insert own payment submissions"
ON public.payment_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id = public.current_parent_id()
  AND EXISTS (
    SELECT 1
    FROM public.parent_students AS ps
    WHERE ps.parent_id = public.current_parent_id()
      AND ps.student_id = payment_submissions.student_id
  )
);

COMMIT;
