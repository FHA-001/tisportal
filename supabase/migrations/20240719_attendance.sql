-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON attendance(recorded_by);

-- Enable Row Level Security
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance
CREATE POLICY "Admins can view all attendance" ON attendance FOR SELECT USING (true);
CREATE POLICY "Admins can insert attendance" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Admins can delete attendance" ON attendance FOR DELETE USING (true);

CREATE POLICY "Teachers can view attendance for their classes" ON attendance FOR SELECT 
USING (
  class_id IN (
    SELECT class_id FROM class_subjects WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can insert attendance for their classes" ON attendance FOR INSERT 
WITH CHECK (
  class_id IN (
    SELECT class_id FROM class_subjects WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update attendance for their classes" ON attendance FOR UPDATE 
USING (
  class_id IN (
    SELECT class_id FROM class_subjects WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete attendance for their classes" ON attendance FOR DELETE 
USING (
  class_id IN (
    SELECT class_id FROM class_subjects WHERE teacher_id = auth.uid()
  )
);

CREATE POLICY "Students can view their own attendance" ON attendance FOR SELECT 
USING (student_id = auth.uid());

CREATE POLICY "Parents can view their children's attendance" ON attendance FOR SELECT 
USING (
  student_id IN (
    SELECT student_id FROM parent_students WHERE parent_id = auth.uid()
  )
);

-- Note: parent_students table is created in 20240719_parents.sql
-- This migration should be run AFTER 20240719_parents.sql
