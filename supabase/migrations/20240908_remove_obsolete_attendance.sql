-- ============================================================
-- TIS PORTAL — REMOVE OBSOLETE ATTENDANCE FEATURE
-- Attendance was removed from product scope.
-- This migration removes the unused live table without CASCADE.
-- If any unexpected dependency exists, PostgreSQL will stop safely.
-- ============================================================

BEGIN;

DROP TABLE IF EXISTS public.attendance;

COMMIT;
