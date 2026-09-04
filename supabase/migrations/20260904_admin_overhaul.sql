-- Add served_cities column to preorder_settings
-- Cities are now a first-class concept, independent of delivery dates
ALTER TABLE preorder_settings
  ADD COLUMN IF NOT EXISTS served_cities JSONB NOT NULL DEFAULT '[]';
