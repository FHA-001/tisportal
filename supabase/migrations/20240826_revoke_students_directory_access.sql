-- Revoke students_directory Access
-- This migration completely removes browser/client access to public.students_directory
-- which previously exposed student personal data anonymously

BEGIN;

-- ============================================================
-- 1. REVOKE VIEW ACCESS
-- ============================================================

-- Revoke all privileges from PUBLIC
REVOKE ALL PRIVILEGES
ON TABLE public.students_directory
FROM PUBLIC;

-- Revoke all privileges from anon
REVOKE ALL PRIVILEGES
ON TABLE public.students_directory
FROM anon;

-- Revoke all privileges from authenticated
REVOKE ALL PRIVILEGES
ON TABLE public.students_directory
FROM authenticated;

-- ============================================================
-- 2. PRESERVE ADMINISTRATIVE ACCESS
-- ============================================================

-- Preserve postgres/service_role administrative access
-- These roles retain full access for administrative purposes

-- ============================================================
-- 3. DO NOT DROP THE VIEW
-- ============================================================

-- The view is preserved for potential future administrative use
-- Only browser/client access is removed

COMMIT;
