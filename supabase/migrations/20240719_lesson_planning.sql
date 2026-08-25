-- Lesson Planning Table
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  objectives TEXT[],
  materials TEXT[],
  activities TEXT,
  homework TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON lesson_plans(class_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON lesson_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_date ON lesson_plans(lesson_date);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON lesson_plans(status);

-- Enable Row Level Security
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson plans
CREATE POLICY "Admins can view all lesson plans" ON lesson_plans FOR SELECT USING (true);
CREATE POLICY "Admins can insert lesson plans" ON lesson_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update lesson plans" ON lesson_plans FOR UPDATE USING (true);
CREATE POLICY "Admins can delete lesson plans" ON lesson_plans FOR DELETE USING (true);

CREATE POLICY "Teachers can view their own lesson plans" ON lesson_plans FOR SELECT 
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert their own lesson plans" ON lesson_plans FOR INSERT 
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update their own lesson plans" ON lesson_plans FOR UPDATE 
USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own lesson plans" ON lesson_plans FOR DELETE 
USING (teacher_id = auth.uid());
