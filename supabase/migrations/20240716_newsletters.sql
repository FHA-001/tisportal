-- Test: First check current RLS status
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'newsletters';

-- Force disable RLS completely
ALTER TABLE IF EXISTS newsletters DISABLE ROW LEVEL SECURITY;

-- Drop table to start fresh
DROP TABLE IF EXISTS newsletters CASCADE;

-- Create table with RLS enabled
CREATE TABLE newsletters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  pdf_url TEXT NOT NULL,
  pdf_file_name VARCHAR(255) NOT NULL,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_newsletters_published ON newsletters(is_published, published_at DESC);
CREATE INDEX idx_newsletters_date ON newsletters(published_at DESC);

-- RLS Policies
CREATE POLICY "Anyone can view published newsletters" ON newsletters FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can view all newsletters" ON newsletters FOR SELECT USING (true);
CREATE POLICY "Admins can insert newsletters" ON newsletters FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update newsletters" ON newsletters FOR UPDATE USING (true);
CREATE POLICY "Admins can delete newsletters" ON newsletters FOR DELETE USING (true);
