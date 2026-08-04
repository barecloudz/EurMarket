-- Add Square sync settings to store_settings table
ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS square_sync_frequency TEXT DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS square_last_synced_at TIMESTAMPTZ;
