-- =====================================================
-- Fix Users Table Schema
-- Update column names to match auth service expectations
-- =====================================================

-- Add missing columns and rename existing ones
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Update password_hash to password if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
    UPDATE users SET password = password_hash WHERE password_hash IS NOT NULL;
    ALTER TABLE users DROP COLUMN password_hash;
  END IF;
END$$;

-- Migrate is_premium to subscription_status
UPDATE users 
SET subscription_status = CASE 
  WHEN is_premium = true THEN 'premium'
  ELSE 'free'
END;

-- Migrate subscription_expires_at to premium_expires_at
UPDATE users 
SET premium_expires_at = subscription_expires_at 
WHERE subscription_expires_at IS NOT NULL;

-- Drop old columns
ALTER TABLE users DROP COLUMN IF EXISTS is_premium;
ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at;

-- Add constraints for subscription_status
ALTER TABLE users 
ADD CONSTRAINT check_subscription_status 
CHECK (subscription_status IN ('free', 'premium', 'expired'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

SELECT 'Users table schema updated successfully!' as status;