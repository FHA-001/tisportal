-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'general' CHECK (announcement_type IN ('general', 'urgent', 'event', 'exam', 'holiday', 'other')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'teachers', 'parents', 'admin')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  published_by UUID,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_type ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at);

-- Enable Row Level Security
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Admins can view all announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins can insert announcements" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update announcements" ON announcements FOR UPDATE USING (true);
CREATE POLICY "Admins can delete announcements" ON announcements FOR DELETE USING (true);

CREATE POLICY "Teachers can view announcements" ON announcements FOR SELECT 
USING (
  target_audience IN ('all', 'teachers')
);

CREATE POLICY "Students can view announcements" ON announcements FOR SELECT 
USING (
  target_audience IN ('all', 'students')
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
);

CREATE POLICY "Parents can view announcements" ON announcements FOR SELECT 
USING (
  target_audience IN ('all', 'parents')
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > NOW())
);
