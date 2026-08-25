-- School Fees Table
CREATE TABLE IF NOT EXISTS school_fees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL UNIQUE,
  fee_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Accounts Table
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(200) NOT NULL DEFAULT 'Triton International School',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_fees_class ON school_fees(class_name);
CREATE INDEX IF NOT EXISTS idx_school_fees_session ON school_fees(academic_session_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_active ON payment_accounts(is_active);

-- Enable Row Level Security
ALTER TABLE school_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for school_fees (public read, authenticated write)
CREATE POLICY "Anyone can view school fees" ON school_fees FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert school fees" ON school_fees FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update school fees" ON school_fees FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete school fees" ON school_fees FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for payment_accounts (public read, authenticated write)
CREATE POLICY "Anyone can view payment accounts" ON payment_accounts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert payment accounts" ON payment_accounts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update payment accounts" ON payment_accounts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete payment accounts" ON payment_accounts FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default payment accounts
INSERT INTO payment_accounts (bank_name, account_number, account_name, sort_order) VALUES
  ('U.B.A Bank', '1014140780', 'Triton International School', 1),
  ('Access Bank', '0044164748', 'Triton International School', 2),
  ('Union Bank', '0043385985', 'Triton International School', 3),
  ('Zenith Bank', '1010852362', 'Triton International School', 4),
  ('GTB', '0135999522', 'Triton International School', 5)
ON CONFLICT DO NOTHING;

-- Insert default class fees (will be updated by admin)
INSERT INTO school_fees (class_name, fee_amount) VALUES
  ('JSS1', 0),
  ('JSS2', 0),
  ('JSS3', 0),
  ('SSS1', 0),
  ('SSS2', 0),
  ('SSS3', 0)
ON CONFLICT (class_name) DO NOTHING;
