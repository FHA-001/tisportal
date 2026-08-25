-- Add missing classes to the system
-- Pre Nursery, Nursery 1, Nursery 2, Primary 1-5

-- Add sort_order column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classes' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE classes ADD COLUMN sort_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Insert missing classes with proper hierarchical order
INSERT INTO classes (name, grade_level, sort_order) VALUES
  ('Pre Nursery', 'Pre-Nursery', 1),
  ('Nursery 1', 'Nursery', 2),
  ('Nursery 2', 'Nursery', 3),
  ('Primary 1', 'Primary', 4),
  ('Primary 2', 'Primary', 5),
  ('Primary 3', 'Primary', 6),
  ('Primary 4', 'Primary', 7),
  ('Primary 5', 'Primary', 8);

-- Update existing classes to have proper sort order
UPDATE classes SET sort_order = 9 WHERE name = 'JSS 1';
UPDATE classes SET sort_order = 10 WHERE name = 'JSS 2';
UPDATE classes SET sort_order = 11 WHERE name = 'JSS 3';
UPDATE classes SET sort_order = 12 WHERE name = 'SSS 1';
UPDATE classes SET sort_order = 13 WHERE name = 'SSS 2';
UPDATE classes SET sort_order = 14 WHERE name = 'SSS 3';
