-- Parents Table
CREATE TABLE IF NOT EXISTS parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  password_hash TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parent-Student Relationships Table (only if students table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students') THEN
        CREATE TABLE IF NOT EXISTS parent_students (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          relationship TEXT NOT NULL DEFAULT 'Parent',
          is_primary BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(parent_id, student_id)
        );
    END IF;
END $$;

-- Fee Payments Table (only if students and academic_sessions tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'students') 
       AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'academic_sessions') THEN
        CREATE TABLE IF NOT EXISTS fee_payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          term_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
          amount DECIMAL(10, 2) NOT NULL,
          date_paid TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          recorded_by UUID,
          reference_note TEXT,
          payment_method TEXT DEFAULT 'Bank Transfer',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- School Account Details Table (for fee payment info)
CREATE TABLE IF NOT EXISTS school_account_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_parents_active ON parents(is_active);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_student ON parent_students(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_term ON fee_payments(term_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(date_paid DESC);

-- Enable Row Level Security
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_account_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for parents
CREATE POLICY "Admins can view all parents" ON parents FOR SELECT USING (true);
CREATE POLICY "Admins can insert parents" ON parents FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update parents" ON parents FOR UPDATE USING (true);
CREATE POLICY "Admins can delete parents" ON parents FOR DELETE USING (true);

CREATE POLICY "Parents can view own profile" ON parents FOR SELECT USING (id = auth.uid());

-- RLS Policies for parent_students
CREATE POLICY "Admins can view all parent_students" ON parent_students FOR SELECT USING (true);
CREATE POLICY "Admins can insert parent_students" ON parent_students FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update parent_students" ON parent_students FOR UPDATE USING (true);
CREATE POLICY "Admins can delete parent_students" ON parent_students FOR DELETE USING (true);

CREATE POLICY "Parents can view their student relationships" ON parent_students FOR SELECT 
USING (parent_id = auth.uid());

-- RLS Policies for fee_payments
CREATE POLICY "Admins can view all fee_payments" ON fee_payments FOR SELECT USING (true);
CREATE POLICY "Admins can insert fee_payments" ON fee_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update fee_payments" ON fee_payments FOR UPDATE USING (true);
CREATE POLICY "Admins can delete fee_payments" ON fee_payments FOR DELETE USING (true);

CREATE POLICY "Parents can view their children's fee payments" ON fee_payments FOR SELECT 
USING (
  student_id IN (
    SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own fee payments" ON fee_payments FOR SELECT 
USING (student_id = auth.uid());

-- RLS Policies for school_account_details
CREATE POLICY "Admins can view school_account_details" ON school_account_details FOR SELECT USING (true);
CREATE POLICY "Admins can insert school_account_details" ON school_account_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update school_account_details" ON school_account_details FOR UPDATE USING (true);
CREATE POLICY "Admins can delete school_account_details" ON school_account_details FOR DELETE USING (true);

CREATE POLICY "Parents can view school_account_details" ON school_account_details FOR SELECT USING (is_active = true);

-- Parent Login RPC Function
CREATE OR REPLACE FUNCTION login_parent(p_email TEXT, p_password_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_record RECORD;
  result JSONB;
BEGIN
  -- Check if parent exists and password matches
  SELECT 
    parents.id,
    parents.full_name,
    parents.email
  INTO parent_record
  FROM parents
  WHERE parents.email = p_email 
    AND parents.password_hash = p_password_hash
    AND parents.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    -- Check if parent exists but wrong password
    IF EXISTS (SELECT 1 FROM parents WHERE email = p_email) THEN
      result := jsonb_build_object('error', 'invalid_password');
      RETURN result;
    ELSE
      result := jsonb_build_object('error', 'not_found');
      RETURN result;
    END IF;
  END IF;

  -- Return parent data as a single JSON object
  result := jsonb_build_object(
    'id', parent_record.id,
    'full_name', parent_record.full_name,
    'email', parent_record.email,
    'error', NULL::TEXT
  );
  
  RETURN result;
END;
$$;

-- RPC function for parents to get their children with student data
CREATE OR REPLACE FUNCTION get_parent_children(p_parent_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  student_id UUID,
  relationship TEXT,
  is_primary BOOLEAN,
  student_name TEXT,
  student_admission_number TEXT,
  student_username TEXT,
  student_class_id UUID,
  student_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.parent_id,
    ps.student_id,
    ps.relationship,
    ps.is_primary,
    s.full_name as student_name,
    s.admission_number as student_admission_number,
    s.username as student_username,
    s.class_id as student_class_id,
    s.tier as student_tier
  FROM parent_students ps
  LEFT JOIN students s ON ps.student_id = s.id
  WHERE ps.parent_id = p_parent_id
  ORDER BY ps.is_primary DESC;
END;
$$;
