-- Updated Churches table schema to match Add Church component requirements
-- This script updates the existing churches table structure

-- Add missing columns if they don't exist
ALTER TABLE churches 
ADD COLUMN IF NOT EXISTS church_name VARCHAR(255) AFTER id,
ADD COLUMN IF NOT EXISTS language_preference ENUM('en', 'gr', 'ru', 'ro') DEFAULT 'en' AFTER country,
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) AFTER language_preference,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE AFTER timezone;

-- Update existing name column to church_name if needed
UPDATE churches SET church_name = name WHERE church_name IS NULL AND name IS NOT NULL;

-- Update existing email column to admin_email if needed  
UPDATE churches SET admin_email = email WHERE admin_email IS NULL AND email IS NOT NULL;

-- Update existing preferred_language to language_preference if needed
UPDATE churches SET language_preference = preferred_language WHERE language_preference IS NULL AND preferred_language IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_churches_church_name ON churches(church_name);
CREATE INDEX IF NOT EXISTS idx_churches_admin_email ON churches(admin_email);
CREATE INDEX IF NOT EXISTS idx_churches_country ON churches(country);
CREATE INDEX IF NOT EXISTS idx_churches_is_active ON churches(is_active);

-- Make admin_email unique
ALTER TABLE churches ADD CONSTRAINT uk_churches_admin_email UNIQUE (admin_email);
