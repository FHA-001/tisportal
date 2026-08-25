-- Security Audit: Row-Level Security (RLS) Implementation
-- This migration implements strict RLS policies for grades, students, and teachers tables
-- to ensure proper data isolation and access control

-- Note: This migration assumes core tables (grades, students, teachers, admins, classes, etc.) already exist
-- If tables don't exist, run base schema setup first

-- Enable RLS on critical tables (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'grades') THEN
        ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students') THEN
        ALTER TABLE students ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teachers') THEN
        ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- GRADES TABLE RLS POLICIES
-- ============================================

-- Admins can view all grades
CREATE POLICY "Admins can view all grades" 
ON grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can insert grades
CREATE POLICY "Admins can insert grades" 
ON grades FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can update grades
CREATE POLICY "Admins can update grades" 
ON grades FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can delete grades
CREATE POLICY "Admins can delete grades" 
ON grades FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Teachers can only view grades for their assigned classes
CREATE POLICY "Teachers can view their class grades" 
ON grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'teacher'
  )
  AND EXISTS (
    SELECT 1 FROM class_subjects cs
    JOIN teachers t ON t.id = cs.teacher_id
    JOIN auth.users au ON au.raw_user_meta_data->>'teacher_id' = t.id::text
    WHERE cs.id = grades.class_subject_id
    AND au.id = auth.uid()
  )
);

-- Teachers can only insert grades for their assigned classes
CREATE POLICY "Teachers can insert their class grades" 
ON grades FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'teacher'
  )
  AND EXISTS (
    SELECT 1 FROM class_subjects cs
    JOIN teachers t ON t.id = cs.teacher_id
    JOIN auth.users au ON au.raw_user_meta_data->>'teacher_id' = t.id::text
    WHERE cs.id = grades.class_subject_id
    AND au.id = auth.uid()
  )
);

-- Teachers can only update grades for their assigned classes
CREATE POLICY "Teachers can update their class grades" 
ON grades FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'teacher'
  )
  AND EXISTS (
    SELECT 1 FROM class_subjects cs
    JOIN teachers t ON t.id = cs.teacher_id
    JOIN auth.users au ON au.raw_user_meta_data->>'teacher_id' = t.id::text
    WHERE cs.id = grades.class_subject_id
    AND au.id = auth.uid()
  )
);

-- Students can only view their own grades
CREATE POLICY "Students can view own grades" 
ON grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN auth.users au ON au.raw_user_meta_data->>'student_id' = s.id::text
    WHERE s.id = grades.student_id
    AND au.id = auth.uid()
  )
);

-- Parents can view grades for their linked students
CREATE POLICY "Parents can view children grades" 
ON grades FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'parent'
  )
  AND EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN parents p ON p.id = ps.parent_id
    JOIN auth.users au ON au.raw_user_meta_data->>'parent_id' = p.id::text
    WHERE ps.student_id = grades.student_id
    AND au.id = auth.uid()
  )
);

-- ============================================
-- STUDENTS TABLE RLS POLICIES
-- ============================================

-- Admins can view all students
CREATE POLICY "Admins can view all students" 
ON students FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can insert students
CREATE POLICY "Admins can insert students" 
ON students FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can update students
CREATE POLICY "Admins can update students" 
ON students FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can delete students
CREATE POLICY "Admins can delete students" 
ON students FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Teachers can view students in their assigned classes
CREATE POLICY "Teachers can view their class students" 
ON students FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'teacher'
  )
  AND EXISTS (
    SELECT 1 FROM class_subjects cs
    JOIN teachers t ON t.id = cs.teacher_id
    JOIN auth.users au ON au.raw_user_meta_data->>'teacher_id' = t.id::text
    WHERE cs.class_id = students.class_id
    AND au.id = auth.uid()
  )
);

-- Students can only view their own record
CREATE POLICY "Students can view own record" 
ON students FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM students s
    JOIN auth.users au ON au.raw_user_meta_data->>'student_id' = s.id::text
    WHERE s.id = students.id
    AND au.id = auth.uid()
  )
);

-- Parents can view their linked students
CREATE POLICY "Parents can view their children" 
ON students FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'parent'
  )
  AND EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN parents p ON p.id = ps.parent_id
    JOIN auth.users au ON au.raw_user_meta_data->>'parent_id' = p.id::text
    WHERE ps.student_id = students.id
    AND au.id = auth.uid()
  )
);

-- ============================================
-- TEACHERS TABLE RLS POLICIES
-- ============================================

-- Admins can view all teachers
CREATE POLICY "Admins can view all teachers" 
ON teachers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can insert teachers
CREATE POLICY "Admins can insert teachers" 
ON teachers FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can update teachers
CREATE POLICY "Admins can update teachers" 
ON teachers FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Admins can delete teachers
CREATE POLICY "Admins can delete teachers" 
ON teachers FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Teachers can only view their own record
CREATE POLICY "Teachers can view own record" 
ON teachers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'teacher'
  )
  AND EXISTS (
    SELECT 1 FROM teachers t
    JOIN auth.users au ON au.raw_user_meta_data->>'teacher_id' = t.id::text
    WHERE t.id = teachers.id
    AND au.id = auth.uid()
  )
);

-- Students can view teacher information (for their classes)
CREATE POLICY "Students can view teachers" 
ON teachers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'student'
  )
  AND EXISTS (
    SELECT 1 FROM class_subjects cs
    JOIN students s ON s.class_id = cs.class_id
    JOIN auth.users au ON au.raw_user_meta_data->>'student_id' = s.id::text
    WHERE cs.teacher_id = teachers.id
    AND au.id = auth.uid()
  )
);

-- Parents can view teacher information for their children
CREATE POLICY "Parents can view children teachers" 
ON teachers FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'parent'
  )
  AND EXISTS (
    SELECT 1 FROM parent_students ps
    JOIN students s ON s.id = ps.student_id
    JOIN class_subjects cs ON s.class_id = cs.class_id
    JOIN parents p ON p.id = ps.parent_id
    JOIN auth.users au ON au.raw_user_meta_data->>'parent_id' = p.id::text
    WHERE cs.teacher_id = teachers.id
    AND au.id = auth.uid()
  )
);

-- ============================================
-- SECURITY NOTES
-- ============================================
-- 1. All policies use auth.uid() to identify the current user
-- 2. Role-based access is enforced through user metadata
-- 3. Teachers are restricted to their assigned classes only
-- 4. Students can only access their own data
-- 5. Parents can only access data for their linked children
-- 6. Admins have full access to all data
-- 7. No public (anon) access is granted to sensitive data
