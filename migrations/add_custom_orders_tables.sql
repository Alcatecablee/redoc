-- Migration: Add Custom Orders and Discount Codes tables
-- Created: 2025-01-23
-- Purpose: Support Configure Your Project custom pricing feature

-- Custom orders table for tracking configuration quotes and orders
CREATE TABLE IF NOT EXISTS custom_orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  
  -- Customer Information
  user_id INTEGER REFERENCES users(id),
  email TEXT NOT NULL,
  
  -- Project Details
  url TEXT NOT NULL,
  github_repo TEXT,
  
  -- Configuration
  tier TEXT NOT NULL CHECK (tier IN ('custom', 'standard', 'professional', 'enterprise')),
  sections TEXT NOT NULL CHECK (sections IN ('8-12', '13-20', '20+')),
  source_depth TEXT NOT NULL CHECK (source_depth IN ('basic', 'standard', 'deep')),
  delivery TEXT NOT NULL CHECK (delivery IN ('standard', 'rush', 'same-day')),
  formats JSONB NOT NULL,
  branding TEXT NOT NULL CHECK (branding IN ('basic', 'advanced')),
  youtube_options JSONB,
  seo_options JSONB,
  enterprise_features JSONB,
  
  -- Custom Requirements
  custom_requirements TEXT,
  requirements_parsed JSONB,
  requirements_complexity_score INTEGER,
  
  -- Pricing
  pricing_breakdown JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'ZAR')),
  discount_code TEXT,
  
  -- Payment
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  
  -- Order Status
  status TEXT DEFAULT 'quote' CHECK (status IN ('quote', 'pending_payment', 'processing', 'completed', 'cancelled')),
  fulfillment_status TEXT CHECK (fulfillment_status IN ('not_started', 'in_progress', 'delivered')),
  
  -- Delivery
  estimated_delivery_date TIMESTAMP,
  actual_delivery_date TIMESTAMP,
  delivery_url TEXT,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  referral_source TEXT,
  session_data JSONB,
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_orders_user_id ON custom_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_email ON custom_orders(email);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON custom_orders(status);
CREATE INDEX IF NOT EXISTS idx_custom_orders_payment_status ON custom_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_custom_orders_created_at ON custom_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_orders_order_number ON custom_orders(order_number);

-- Discount codes table for promotional campaigns
CREATE TABLE IF NOT EXISTS discount_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for discount codes
CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

-- Function to generate unique order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  -- Format: ORD-YYYYMM-NNNNNN
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 12) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM custom_orders
  WHERE order_number LIKE 'ORD-' || year_month || '-%';
  
  -- Format the order number
  order_num := 'ORD-' || year_month || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order numbers if not provided
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
BEFORE INSERT ON custom_orders
FOR EACH ROW
EXECUTE FUNCTION set_order_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_orders_timestamp
BEFORE UPDATE ON custom_orders
FOR EACH ROW
EXECUTE FUNCTION update_custom_orders_updated_at();

-- Insert some initial discount codes for testing
INSERT INTO discount_codes (code, description, discount_type, discount_value, max_uses, is_active)
VALUES 
  ('LAUNCH50', 'Launch promotion - 50% off', 'percentage', 50.00, 100, TRUE),
  ('WELCOME10', 'Welcome discount - 10% off', 'percentage', 10.00, NULL, TRUE),
  ('EARLYBIRD', 'Early bird special - $100 off', 'fixed', 100.00, 50, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE custom_orders IS 'Stores custom documentation orders from Configure Your Project feature';
COMMENT ON COLUMN custom_orders.order_number IS 'Human-friendly order identifier (e.g., ORD-202501-000001)';
COMMENT ON COLUMN custom_orders.requirements_parsed IS 'Parsed custom requirements with categorization';
COMMENT ON COLUMN custom_orders.requirements_complexity_score IS 'Automated complexity score (1-100)';
COMMENT ON COLUMN custom_orders.pricing_breakdown IS 'Complete pricing calculation breakdown';
COMMENT ON COLUMN custom_orders.status IS 'Order workflow status';
COMMENT ON COLUMN custom_orders.fulfillment_status IS 'Documentation delivery status';

COMMENT ON TABLE discount_codes IS 'Promotional discount codes for custom orders';
COMMENT ON COLUMN discount_codes.discount_type IS 'percentage: discount_value% off, fixed: $discount_value off';
COMMENT ON COLUMN discount_codes.current_uses IS 'Number of times this code has been used';
