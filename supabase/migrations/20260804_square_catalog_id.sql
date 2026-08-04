-- Add square_catalog_id to products table for Square catalog sync
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS square_catalog_id TEXT UNIQUE;

-- Index for fast upsert lookups
CREATE INDEX IF NOT EXISTS idx_products_square_catalog_id
  ON products (square_catalog_id)
  WHERE square_catalog_id IS NOT NULL;
