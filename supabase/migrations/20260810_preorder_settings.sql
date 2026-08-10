-- Pre-order system settings table
CREATE TABLE IF NOT EXISTS preorder_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- single row
  orders_open BOOLEAN NOT NULL DEFAULT FALSE,
  order_deadline TIMESTAMPTZ,
  delivery_dates JSONB NOT NULL DEFAULT '[]', -- [{date: "2026-08-15", label: "Saturday Aug 15", cities: ["all"] or ["Asheville, NC",...]}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default row
INSERT INTO preorder_settings (id, orders_open) VALUES (1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Add new fields to pre_orders
ALTER TABLE pre_orders ADD COLUMN IF NOT EXISTS delivery_date TEXT;
ALTER TABLE pre_orders ADD COLUMN IF NOT EXISTS suggestions TEXT;

-- RLS
ALTER TABLE preorder_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (to know if orders are open)
CREATE POLICY "public_read_preorder_settings"
  ON preorder_settings FOR SELECT USING (true);

-- Only admins can update
CREATE POLICY "admin_update_preorder_settings"
  ON preorder_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
