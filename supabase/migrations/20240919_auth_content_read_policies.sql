-- ============================================================
-- TIS Auth Modernization - A3 content RLS bridge
--
-- Teacher / Accountant / Parent now use Supabase Auth, so their
-- browser role is "authenticated" instead of "anon".
--
-- Preserve the existing read behavior:
--   announcements: active rows are readable
--   newsletters:   published rows are readable
--
-- Admin CRUD policies remain unchanged.
-- Student custom-auth/anon access remains unchanged.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Announcements
-- Existing anon policy:
--   announcements_anon_select_active -> is_active = true
--
-- Add the equivalent authenticated read path. Admins continue to
-- see all announcements through announcements_admin_select.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS announcements_authenticated_select_active
ON public.announcements;

CREATE POLICY announcements_authenticated_select_active
ON public.announcements
FOR SELECT
TO authenticated
USING (is_active = true);


-- ------------------------------------------------------------
-- Newsletters
-- Existing anon policy:
--   newsletters_public_select_published -> is_published = true
--
-- Add the equivalent authenticated read path. Admins continue to
-- see drafts through newsletters_admin_select.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS newsletters_authenticated_select_published
ON public.newsletters;

CREATE POLICY newsletters_authenticated_select_published
ON public.newsletters
FOR SELECT
TO authenticated
USING (is_published = true);

COMMIT;
