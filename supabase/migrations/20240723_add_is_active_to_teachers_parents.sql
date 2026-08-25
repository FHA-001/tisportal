-- Add is_active column to teachers and parents tables
-- This is needed for the login RPCs to check account status

-- Add is_active column to teachers table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teachers') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'is_active') THEN
      ALTER TABLE teachers ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
    END IF;
  END IF;
END $$;

-- Add is_active column to parents table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'parents') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'parents' AND column_name = 'is_active') THEN
      ALTER TABLE parents ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
    END IF;
  END IF;
END $$;

-- Update existing teachers to be active by default
UPDATE teachers SET is_active = true WHERE is_active IS NULL;

-- Update existing parents to be active by default
UPDATE parents SET is_active = true WHERE is_active IS NULL;
