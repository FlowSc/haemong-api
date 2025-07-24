-- ===================================
-- HAEMONG API - Complete Database Setup
-- Dream Interpretation Chatbot with Premium Features
-- ===================================

-- Drop existing objects if they exist (for clean setup)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_or_create_todays_chat_room(UUID, TEXT, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_message_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_bot_settings_options() CASCADE;
DROP FUNCTION IF EXISTS is_user_premium(UUID) CASCADE;
DROP FUNCTION IF EXISTS upgrade_user_to_premium(UUID, TIMESTAMP WITH TIME ZONE) CASCADE;
DROP FUNCTION IF EXISTS get_subscription_stats() CASCADE;
DROP FUNCTION IF EXISTS check_premium_expiry() CASCADE;
DROP FUNCTION IF EXISTS get_messages_with_images(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_dream_images(UUID, INTEGER) CASCADE;

-- Drop tables if they exist
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ===================================
-- 1. UTILITY FUNCTIONS
-- ===================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 2. USERS TABLE
-- ===================================

-- Create users table with subscription support
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  nickname VARCHAR(8) NOT NULL UNIQUE,
  password VARCHAR(255), -- NULL for OAuth users
  provider VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google', 'apple')),
  provider_id VARCHAR(255), -- OAuth provider's user ID
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free', 'premium', 'expired')),
  premium_expires_at TIMESTAMP WITH TIME ZONE, -- NULL for lifetime or free users
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_provider_id ON users(provider, provider_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_premium_expires ON users(premium_expires_at) WHERE premium_expires_at IS NOT NULL;

-- Create trigger for users updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraints for users
ALTER TABLE users ADD CONSTRAINT check_oauth_provider_id 
  CHECK (
    (provider = 'email' AND provider_id IS NULL AND password IS NOT NULL) OR
    (provider IN ('google', 'apple') AND provider_id IS NOT NULL AND password IS NULL)
  );

-- ===================================
-- 3. CHAT_ROOMS TABLE
-- ===================================

-- Create chat_rooms table with bot personality settings
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD format for daily chat rooms
  bot_gender VARCHAR(10) NOT NULL DEFAULT 'female' CHECK (bot_gender IN ('male', 'female')),
  bot_style VARCHAR(10) NOT NULL DEFAULT 'eastern' CHECK (bot_style IN ('eastern', 'western')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat_rooms table
CREATE INDEX idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX idx_chat_rooms_date ON chat_rooms(date);
CREATE INDEX idx_chat_rooms_user_date ON chat_rooms(user_id, date);
CREATE INDEX idx_chat_rooms_is_active ON chat_rooms(is_active);
CREATE INDEX idx_chat_rooms_bot_settings ON chat_rooms(bot_gender, bot_style);

-- Create unique index for one chat room per user per day
CREATE UNIQUE INDEX idx_chat_rooms_unique_user_date_active 
  ON chat_rooms(user_id, date) 
  WHERE is_active = true;

-- Create trigger for chat_rooms updated_at
CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 4. MESSAGES TABLE
-- ===================================

-- Create messages table with image support
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'bot')),
  content TEXT NOT NULL,
  image_url TEXT, -- Dream visualization image URL (for bot messages only)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for messages table
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_image_url ON messages(image_url) WHERE image_url IS NOT NULL;

-- ===================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY users_select_own ON users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY users_update_own ON users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- RLS Policies for chat_rooms
CREATE POLICY chat_rooms_select_own ON chat_rooms 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY chat_rooms_insert_own ON chat_rooms 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY chat_rooms_update_own ON chat_rooms 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY chat_rooms_delete_own ON chat_rooms 
  FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY messages_select_own ON messages 
  FOR SELECT 
  USING (
    chat_room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY messages_insert_own ON messages 
  FOR INSERT 
  WITH CHECK (
    chat_room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()
    )
  );

CREATE POLICY messages_update_own ON messages 
  FOR UPDATE 
  USING (
    chat_room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()
    )
  );

-- ===================================
-- 6. PERMISSIONS
-- ===================================

-- Grant basic permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;

-- ===================================
-- 7. BUSINESS LOGIC FUNCTIONS
-- ===================================

-- Function to check if user is premium
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

-- Function to upgrade user to premium
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

-- Function to get subscription statistics
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
  
  IF total_users = 0 THEN
    total_users := 1; -- Avoid division by zero
  END IF;
  
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

-- Function to check and update expired premium users
CREATE OR REPLACE FUNCTION check_premium_expiry()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'premium' 
    AND premium_expires_at IS NOT NULL 
    AND premium_expires_at <= NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create today's chat room
CREATE OR REPLACE FUNCTION get_or_create_todays_chat_room(
  p_user_id UUID, 
  p_title TEXT DEFAULT NULL,
  p_bot_gender VARCHAR(10) DEFAULT 'female',
  p_bot_style VARCHAR(10) DEFAULT 'eastern'
)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  today_date DATE := CURRENT_DATE;
  room_title TEXT := COALESCE(p_title, today_date::TEXT || ' 꿈 해몽');
BEGIN
  -- Try to find existing room for today
  SELECT id INTO room_id
  FROM chat_rooms
  WHERE user_id = p_user_id 
    AND date = today_date 
    AND is_active = true;
  
  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (user_id, title, date, bot_gender, bot_style)
    VALUES (p_user_id, room_title, today_date, p_bot_gender, p_bot_style)
    RETURNING id INTO room_id;
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get message count for a chat room
CREATE OR REPLACE FUNCTION get_message_count(p_chat_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
  msg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE chat_room_id = p_chat_room_id;
  
  RETURN COALESCE(msg_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bot settings options
CREATE OR REPLACE FUNCTION get_bot_settings_options()
RETURNS JSON AS $$
BEGIN
  RETURN JSON_BUILD_OBJECT(
    'genders', JSON_BUILD_ARRAY(
      JSON_BUILD_OBJECT('value', 'male', 'label', '남성'),
      JSON_BUILD_OBJECT('value', 'female', 'label', '여성')
    ),
    'styles', JSON_BUILD_ARRAY(
      JSON_BUILD_OBJECT('value', 'eastern', 'label', '동양풍'),
      JSON_BUILD_OBJECT('value', 'western', 'label', '서양풍')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages with images
CREATE OR REPLACE FUNCTION get_messages_with_images(p_chat_room_id UUID)
RETURNS TABLE (
  id UUID,
  chat_room_id UUID,
  type VARCHAR(10),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.chat_room_id,
    m.type,
    m.content,
    m.image_url,
    m.created_at
  FROM messages m
  WHERE m.chat_room_id = p_chat_room_id 
    AND m.image_url IS NOT NULL
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's dream images gallery
CREATE OR REPLACE FUNCTION get_user_dream_images(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  message_id UUID,
  chat_room_title VARCHAR(255),
  image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    cr.title as chat_room_title,
    m.image_url,
    m.created_at
  FROM messages m
  JOIN chat_rooms cr ON m.chat_room_id = cr.id
  WHERE cr.user_id = p_user_id 
    AND m.type = 'bot'
    AND m.image_url IS NOT NULL
    AND cr.is_active = true
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================
-- 8. GRANT FUNCTION PERMISSIONS
-- ===================================

-- Grant execute permissions on all functions
GRANT EXECUTE ON FUNCTION is_user_premium(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upgrade_user_to_premium(UUID, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION check_premium_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_todays_chat_room(UUID, TEXT, VARCHAR, VARCHAR) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_message_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_bot_settings_options() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_messages_with_images(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_dream_images(UUID, INTEGER) TO anon, authenticated;

-- ===================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ===================================

-- Table comments
COMMENT ON TABLE users IS 'User accounts with OAuth and email authentication support, including subscription management';
COMMENT ON TABLE chat_rooms IS 'Daily chat rooms for dream interpretation with configurable bot personalities';
COMMENT ON TABLE messages IS 'Chat messages between users and AI bots, with optional dream visualization images';

-- Column comments
COMMENT ON COLUMN users.subscription_status IS 'User subscription status: free, premium, or expired';
COMMENT ON COLUMN users.premium_expires_at IS 'Premium subscription expiry date (NULL for lifetime or free users)';
COMMENT ON COLUMN chat_rooms.bot_gender IS 'Gender of the dream interpretation bot (male/female)';
COMMENT ON COLUMN chat_rooms.bot_style IS 'Style of the dream interpretation bot (eastern/western)';
COMMENT ON COLUMN chat_rooms.date IS 'Date of the chat room (YYYY-MM-DD), one room per user per day';
COMMENT ON COLUMN messages.image_url IS 'URL of generated dream visualization image (for bot messages only)';

-- Function comments
COMMENT ON FUNCTION is_user_premium(UUID) IS 'Check if user has active premium subscription';
COMMENT ON FUNCTION upgrade_user_to_premium(UUID, TIMESTAMP WITH TIME ZONE) IS 'Upgrade user to premium subscription';
COMMENT ON FUNCTION get_subscription_stats() IS 'Get subscription statistics for all users';
COMMENT ON FUNCTION check_premium_expiry() IS 'Update expired premium users to expired status';
COMMENT ON FUNCTION get_or_create_todays_chat_room(UUID, TEXT, VARCHAR, VARCHAR) IS 'Get or create today''s chat room for user';
COMMENT ON FUNCTION get_message_count(UUID) IS 'Get total message count for a chat room';
COMMENT ON FUNCTION get_bot_settings_options() IS 'Get available bot personality options';
COMMENT ON FUNCTION get_messages_with_images(UUID) IS 'Get all messages with images from a chat room';
COMMENT ON FUNCTION get_user_dream_images(UUID, INTEGER) IS 'Get user''s dream images gallery';

-- ===================================
-- 10. SAMPLE DATA (OPTIONAL)
-- ===================================

-- Insert sample bot configurations for testing
-- Uncomment if you want sample data
/*
INSERT INTO users (email, nickname, subscription_status) VALUES 
('premium@example.com', '프리미엄유저', 'premium'),
('free@example.com', '무료사용자', 'free');
*/

-- ===================================
-- 11. MAINTENANCE QUERIES
-- ===================================

-- Query to check database health
-- SELECT 'Users' as table_name, COUNT(*) as count FROM users
-- UNION ALL
-- SELECT 'Chat Rooms', COUNT(*) FROM chat_rooms
-- UNION ALL  
-- SELECT 'Messages', COUNT(*) FROM messages;

-- Query to check subscription distribution
-- SELECT * FROM get_subscription_stats();

-- Query to clean up expired premium subscriptions
-- SELECT check_premium_expiry();

-- ===================================
-- SETUP COMPLETE
-- ===================================

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '=== HAEMONG API DATABASE SETUP COMPLETED ===';
  RAISE NOTICE 'Tables created: users, chat_rooms, messages';
  RAISE NOTICE 'Features: Premium subscriptions, Bot personalities, On-demand image generation';
  RAISE NOTICE 'Functions: % utility functions created', 9;
  RAISE NOTICE 'Security: RLS enabled on all tables';
  RAISE NOTICE 'Ready for production use!';
END $$;