-- Add subscription status and premium expiry to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'expired')),
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_premium_expires ON users(premium_expires_at) WHERE premium_expires_at IS NOT NULL;

-- Update existing users to have free subscription by default
UPDATE users 
SET subscription_status = 'free'
WHERE subscription_status IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.subscription_status IS 'User subscription status: free, premium, or expired';
COMMENT ON COLUMN users.premium_expires_at IS 'Premium subscription expiry date (NULL for lifetime or free users)';

-- Create function to check if user is premium
CREATE OR REPLACE FUNCTION is_user_premium(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_status VARCHAR(20);
  expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT subscription_status, premium_expires_at
  INTO user_status, expires_at
  FROM users
  WHERE id = p_user_id AND is_active = true;
  
  -- User not found
  IF user_status IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check premium status
  IF user_status = 'premium' THEN
    -- If no expiry date, it's lifetime premium
    IF expires_at IS NULL THEN
      RETURN TRUE;
    END IF;
    
    -- Check if premium is still valid
    IF expires_at > NOW() THEN
      RETURN TRUE;
    ELSE
      -- Expired, update status
      UPDATE users 
      SET subscription_status = 'expired' 
      WHERE id = p_user_id;
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to upgrade user to premium
CREATE OR REPLACE FUNCTION upgrade_user_to_premium(
  p_user_id UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET 
    subscription_status = 'premium',
    premium_expires_at = p_expires_at,
    updated_at = NOW()
  WHERE id = p_user_id AND is_active = true;
  
  -- Return true if user was found and updated
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get premium user statistics
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE (
  status VARCHAR(20),
  user_count BIGINT,
  percentage DECIMAL(5,2)
) AS $$
DECLARE
  total_users BIGINT;
BEGIN
  -- Get total active users
  SELECT COUNT(*) INTO total_users FROM users WHERE is_active = true;
  
  RETURN QUERY
  SELECT 
    u.subscription_status as status,
    COUNT(*) as user_count,
    ROUND((COUNT(*) * 100.0 / total_users), 2) as percentage
  FROM users u
  WHERE u.is_active = true
  GROUP BY u.subscription_status
  ORDER BY u.subscription_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_user_premium(UUID) TO anon;
GRANT EXECUTE ON FUNCTION is_user_premium(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_to_premium(UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats() TO authenticated;

-- Create trigger to automatically update expired premium users
CREATE OR REPLACE FUNCTION check_premium_expiry()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'premium' 
    AND premium_expires_at IS NOT NULL 
    AND premium_expires_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can run this periodically or set up a cron job
-- SELECT check_premium_expiry();