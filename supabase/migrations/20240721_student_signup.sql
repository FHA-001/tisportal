-- Student Self-Signup Migration
-- Adds status tracking for student signup requests

-- Add missing columns to students table if they don't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS tier TEXT;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_name TEXT;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_email TEXT;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Add status tracking columns to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS signup_date TIMESTAMP WITH TIME ZONE;

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE;

-- Add is_active column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add admission_number column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS admission_number TEXT UNIQUE;

-- Make admission_number nullable for pending students (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'admission_number'
  ) THEN
    ALTER TABLE students ALTER COLUMN admission_number DROP NOT NULL;
  END IF;
END $$;

-- Drop existing status check constraint if it exists to avoid conflicts
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;

-- Add status column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- Update existing students: set status to 'approved' and is_active to true for all existing records
UPDATE students 
SET status = 'approved', is_active = true 
WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'rejected');

-- Add the check constraint for status only
ALTER TABLE students 
ADD CONSTRAINT students_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Create RPC for student self-signup
CREATE OR REPLACE FUNCTION student_signup(
  p_full_name TEXT,
  p_username TEXT,
  p_password TEXT,
  p_email TEXT,
  p_phone_number TEXT,
  p_gender TEXT,
  p_class_id TEXT,
  p_tier TEXT,
  p_date_of_birth TEXT,
  p_parent_name TEXT,
  p_parent_phone TEXT,
  p_parent_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
  v_student_id UUID;
BEGIN
  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM students WHERE username = p_username) THEN
    RETURN jsonb_build_object('error', 'username_exists');
  END IF;

  -- Hash the password
  v_password_hash := encode(digest(p_password || 'TIS_SALT_2024', 'sha256'), 'hex');

  -- Insert student with pending status
  INSERT INTO students (
    full_name,
    username,
    password_hash,
    email,
    phone_number,
    gender,
    class_id,
    tier,
    date_of_birth,
    parent_name,
    parent_phone,
    parent_email,
    status,
    signup_date,
    must_change_password,
    is_active
  ) VALUES (
    p_full_name,
    p_username,
    v_password_hash,
    p_email,
    p_phone_number,
    p_gender,
    p_class_id::UUID,
    p_tier,
    p_date_of_birth::DATE,
    p_parent_name,
    p_parent_phone,
    p_parent_email,
    'pending',
    NOW(),
    TRUE,
    FALSE
  ) RETURNING id INTO v_student_id;

  RETURN jsonb_build_object('success', true, 'message', 'Signup request submitted. Please wait for admin approval.');
END;
$$;

-- Create RPC for admin to approve signup request
CREATE OR REPLACE FUNCTION approve_student_signup(
  p_student_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_admission_number TEXT;
  v_existing_numbers TEXT[];
BEGIN
  -- Get student details
  SELECT * INTO v_student FROM students WHERE id = p_student_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'student_not_found_or_not_pending');
  END IF;

  -- Generate admission number
  SELECT array_agg(admission_number) INTO v_existing_numbers FROM students WHERE admission_number IS NOT NULL;
  v_admission_number := generate_admission_number(v_student.tier, v_existing_numbers);

  -- Update student status and generate admission number
  UPDATE students 
  SET 
    status = 'approved',
    admission_number = v_admission_number,
    approved_by = p_admin_id,
    approved_date = NOW()
  WHERE id = p_student_id;

  RETURN jsonb_build_object(
    'success', true, 
    'admission_number', v_admission_number,
    'message', 'Student approved successfully'
  );
END;
$$;

-- Create RPC for admin to reject signup request
CREATE OR REPLACE FUNCTION reject_student_signup(
  p_student_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
BEGIN
  -- Get student details
  SELECT * INTO v_student FROM students WHERE id = p_student_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'student_not_found_or_not_pending');
  END IF;

  -- Update student status to rejected
  UPDATE students 
  SET 
    status = 'rejected',
    approved_by = p_admin_id,
    approved_date = NOW()
  WHERE id = p_student_id;

  RETURN jsonb_build_object('success', true, 'message', 'Student signup request rejected');
END;
$$;

-- Create helper function for admission number generation
CREATE OR REPLACE FUNCTION generate_admission_number(p_tier TEXT, p_existing_numbers TEXT[])
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YY');
  v_prefix TEXT;
  v_next_num INTEGER := 1;
  v_existing_num INTEGER;
BEGIN
  -- Determine prefix based on tier
  IF p_tier = 'Junior School' THEN
    v_prefix := 'JS';
  ELSIF p_tier = 'Middle School' THEN
    v_prefix := 'MS';
  ELSIF p_tier = 'Senior School' THEN
    v_prefix := 'SS';
  ELSE
    v_prefix := 'TS';
  END IF;

  -- Find the next available number
  WHILE v_next_num <= 999 LOOP
    IF NOT (v_prefix || v_year || LPAD(v_next_num::TEXT, 3, '0') = ANY(p_existing_numbers)) THEN
      RETURN v_prefix || v_year || LPAD(v_next_num::TEXT, 3, '0');
    END IF;
    v_next_num := v_next_num + 1;
  END LOOP;

  -- Fallback if all numbers taken
  RETURN v_prefix || v_year || LPAD((random() * 999)::INTEGER::TEXT, 3, '0');
END;
$$;

-- Create view for admin to see pending signups
CREATE OR REPLACE VIEW pending_student_signups AS
SELECT 
  s.id,
  s.full_name,
  s.username,
  s.email,
  s.phone_number,
  s.gender,
  s.class_id,
  s.tier,
  s.date_of_birth,
  s.parent_name,
  s.parent_phone,
  s.parent_email,
  s.signup_date,
  c.name as class_name
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.status = 'pending'
ORDER BY s.signup_date ASC;
