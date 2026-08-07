-- Pre-orders table for homemade goods pickup orders
CREATE TABLE IF NOT EXISTS pre_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  items JSONB NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pre_orders ENABLE ROW LEVEL SECURITY;

-- Anyone can place a pre-order (no account required)
CREATE POLICY "public_insert_pre_orders"
  ON pre_orders FOR INSERT
  WITH CHECK (true);

-- Only admins can read / update pre-orders
CREATE POLICY "admin_read_pre_orders"
  ON pre_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_update_pre_orders"
  ON pre_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
