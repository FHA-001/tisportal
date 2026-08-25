-- Security Audit: Row-Level Security (RLS) Implementation
-- Simplified version that works with existing database structure

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

-- Authenticated users can view all grades (role filtering done in application)
CREATE POLICY "Authenticated users can view grades" 
ON grades FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert grades (role filtering done in application)
CREATE POLICY "Authenticated users can insert grades" 
ON grades FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update grades (role filtering done in application)
CREATE POLICY "Authenticated users can update grades" 
ON grades FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete grades (role filtering done in application)
CREATE POLICY "Authenticated users can delete grades" 
ON grades FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- ============================================
-- STUDENTS TABLE RLS POLICIES
-- ============================================

-- Authenticated users can view all students (role filtering done in application)
CREATE POLICY "Authenticated users can view students" 
ON students FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert students (role filtering done in application)
CREATE POLICY "Authenticated users can insert students" 
ON students FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update students (role filtering done in application)
CREATE POLICY "Authenticated users can update students" 
ON students FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete students (role filtering done in application)
CREATE POLICY "Authenticated users can delete students" 
ON students FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- ============================================
-- TEACHERS TABLE RLS POLICIES
-- ============================================

-- Authenticated users can view all teachers (role filtering done in application)
CREATE POLICY "Authenticated users can view teachers" 
ON teachers FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert teachers (role filtering done in application)
CREATE POLICY "Authenticated users can insert teachers" 
ON teachers FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update teachers (role filtering done in application)
CREATE POLICY "Authenticated users can update teachers" 
ON teachers FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete teachers (role filtering done in application)
CREATE POLICY "Authenticated users can delete teachers" 
ON teachers FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- ============================================
-- SECURITY NOTES
-- ============================================
-- This is a simplified RLS implementation that:
-- 1. Requires authentication for all operations (auth.uid() IS NOT NULL)
-- 2. Role-based filtering is handled at the application level
-- 3. Provides basic security by ensuring only authenticated users can access data
-- 4. More granular RLS can be added later once auth schema is confirmed
-- 5. Application-level role checks in ProtectedRoute and CustomSessionGuard provide additional security
