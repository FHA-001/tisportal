-- Homework Table
CREATE TABLE IF NOT EXISTS homework (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date DATE NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_homework_class ON homework(class_id);
CREATE INDEX IF NOT EXISTS idx_homework_subject ON homework(subject_id);
CREATE INDEX IF NOT EXISTS idx_homework_teacher ON homework(teacher_id);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_published ON homework(published_at DESC);

-- Enable Row Level Security
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

-- RLS Policies for homework
-- Teachers can CRUD only homework they created
CREATE POLICY "Teachers can insert their homework" ON homework FOR INSERT 
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their homework" ON homework FOR UPDATE 
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their homework" ON homework FOR DELETE 
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can view their homework" ON homework FOR SELECT 
USING (teacher_id = auth.uid());

-- Students can only read homework assigned to their class
CREATE POLICY "Students can view their class homework" ON homework FOR SELECT 
USING (
  class_id IN (
    SELECT class_id FROM students WHERE id = auth.uid()
  )
);

-- Admins have full access
CREATE POLICY "Admins can view all homework" ON homework FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert homework" ON homework FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update homework" ON homework FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete homework" ON homework FOR DELETE 
USING (true);
