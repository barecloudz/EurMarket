-- ============================================================
-- Supplier System Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Update profiles role constraint to include 'supplier'
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('customer', 'admin', 'supplier'));

-- 2. Add supplier_id to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

-- 3. Add fulfillment columns to order_items
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered')),
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_items_supplier_id ON order_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status ON order_items(fulfillment_status);

-- 4. Add partially_shipped to order status (if stored as check constraint)
-- Note: if your orders.status is an enum type, alter the enum instead
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'partially_shipped', 'delivered', 'cancelled'));

-- ============================================================
-- RLS POLICIES FOR SUPPLIERS
-- ============================================================

-- Enable RLS on products if not already enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Suppliers can view all active products
CREATE POLICY "suppliers_view_products"
  ON products FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('admin', 'supplier')
    )
  );

-- Suppliers can only insert products assigned to themselves
CREATE POLICY "suppliers_insert_own_products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    supplier_id = auth.uid()
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'supplier')
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Suppliers can only update their own products
CREATE POLICY "suppliers_update_own_products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    (supplier_id = auth.uid() AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'supplier'))
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    (supplier_id = auth.uid() AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'supplier'))
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Suppliers can only delete their own products
CREATE POLICY "suppliers_delete_own_products"
  ON products FOR DELETE
  TO authenticated
  USING (
    (supplier_id = auth.uid() AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'supplier'))
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Suppliers can view orders that contain their products
CREATE POLICY "suppliers_view_their_orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR EXISTS (
      SELECT 1 FROM order_items
      WHERE order_items.order_id = orders.id
        AND order_items.supplier_id = auth.uid()
    )
  );

-- Enable RLS on order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Suppliers can view their own order items
CREATE POLICY "suppliers_view_own_order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR supplier_id = auth.uid()
  );

-- Suppliers can update fulfillment fields on their own items only
CREATE POLICY "suppliers_update_own_order_items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    supplier_id = auth.uid()
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'supplier')
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    supplier_id = auth.uid()
    AND auth.uid() IN (SELECT id FROM profiles WHERE role = 'supplier')
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- ============================================================
-- HELPER: Derive order status from item fulfillment
-- Call this after updating an order item's fulfillment_status
-- ============================================================
CREATE OR REPLACE FUNCTION sync_order_fulfillment_status(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  total_items INT;
  shipped_items INT;
  delivered_items INT;
BEGIN
  SELECT COUNT(*) INTO total_items
  FROM order_items WHERE order_id = p_order_id;

  SELECT COUNT(*) INTO shipped_items
  FROM order_items WHERE order_id = p_order_id AND fulfillment_status IN ('shipped', 'delivered');

  SELECT COUNT(*) INTO delivered_items
  FROM order_items WHERE order_id = p_order_id AND fulfillment_status = 'delivered';

  IF delivered_items = total_items THEN
    UPDATE orders SET status = 'delivered' WHERE id = p_order_id;
  ELSIF shipped_items = total_items THEN
    UPDATE orders SET status = 'shipped' WHERE id = p_order_id;
  ELSIF shipped_items > 0 THEN
    UPDATE orders SET status = 'partially_shipped' WHERE id = p_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (suppliers call this via rpc)
GRANT EXECUTE ON FUNCTION sync_order_fulfillment_status(UUID) TO authenticated;
