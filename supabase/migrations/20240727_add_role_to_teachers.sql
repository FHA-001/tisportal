-- Add role column to teachers table to support different staff roles
-- This enables distinguishing between regular teachers and accountants

-- Add role column with default value 'teacher'
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher' NOT NULL;

-- Add check constraint to ensure only valid roles
ALTER TABLE teachers 
ADD CONSTRAINT teachers_role_check 
CHECK (role IN ('teacher', 'accountant'));

-- Backfill existing teacher records with 'teacher' role
UPDATE teachers 
SET role = 'teacher' 
WHERE role IS NULL OR role NOT IN ('teacher', 'accountant');
