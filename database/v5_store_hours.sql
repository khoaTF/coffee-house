-- =============================================
-- V5: Add missing store hours & location columns to store_settings
-- These columns were used by frontend code but never added to the DB
-- =============================================

-- Store operating hours
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS open_time TEXT DEFAULT '07:00';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS close_time TEXT DEFAULT '22:00';

-- Manual override: true = force open, false = force closed, null = auto (by hours)
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS is_open_override BOOLEAN DEFAULT NULL;

-- Store coordinates for delivery distance calculation
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
