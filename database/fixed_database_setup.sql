-- ===================================
-- Complete Database Setup for Haemong API (Fixed)
-- ===================================

-- Create updated_at trigger function (only if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===================================
-- 1. USERS TABLE
-- ===================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  nickname VARCHAR(8) NOT NULL UNIQUE,
  password VARCHAR(255), -- NULL for OAuth users
  provider VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google', 'apple')),
  provider_id VARCHAR(255), -- OAuth provider's user ID
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create trigger for users (drop if exists to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraints for users
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_oauth_provider_id') THEN
    ALTER TABLE users ADD CONSTRAINT check_oauth_provider_id 
      CHECK (
        (provider = 'email' AND provider_id IS NULL AND password IS NOT NULL) OR
        (provider IN ('google', 'apple') AND provider_id IS NOT NULL AND password IS NULL)
      );
  END IF;
END $$;

-- ===================================
-- 2. CHAT_ROOMS TABLE
-- ===================================

-- Create chat_rooms table with bot settings
CREATE TABLE IF NOT EXISTS chat_rooms (
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
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_date ON chat_rooms(date);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_date ON chat_rooms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON chat_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_bot_settings ON chat_rooms(bot_gender, bot_style);

-- Create trigger for chat_rooms (drop if exists to avoid conflicts)
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for user and date (fixed approach)
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_date') THEN
    ALTER TABLE chat_rooms DROP CONSTRAINT unique_user_date;
  END IF;
  
  -- Create partial unique index instead of constraint with WHERE
  DROP INDEX IF EXISTS idx_chat_rooms_unique_user_date_active;
  CREATE UNIQUE INDEX idx_chat_rooms_unique_user_date_active 
    ON chat_rooms(user_id, date) 
    WHERE is_active = true;
END $$;

-- ===================================
-- 3. MESSAGES TABLE
-- ===================================

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'bot')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

-- ===================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ===================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users 
  FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- RLS Policies for chat_rooms
DROP POLICY IF EXISTS chat_rooms_select_own ON chat_rooms;
CREATE POLICY chat_rooms_select_own ON chat_rooms 
  FOR SELECT 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS chat_rooms_insert_own ON chat_rooms;
CREATE POLICY chat_rooms_insert_own ON chat_rooms 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS chat_rooms_update_own ON chat_rooms;
CREATE POLICY chat_rooms_update_own ON chat_rooms 
  FOR UPDATE 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS chat_rooms_delete_own ON chat_rooms;
CREATE POLICY chat_rooms_delete_own ON chat_rooms 
  FOR DELETE 
  USING (user_id = auth.uid());

-- RLS Policies for messages
DROP POLICY IF EXISTS messages_select_own ON messages;
CREATE POLICY messages_select_own ON messages 
  FOR SELECT 
  USING (
    chat_room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_insert_own ON messages;
CREATE POLICY messages_insert_own ON messages 
  FOR INSERT 
  WITH CHECK (
    chat_room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()
    )
  );

-- ===================================
-- 5. PERMISSIONS
-- ===================================

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- ===================================
-- 6. UTILITY FUNCTIONS
-- ===================================

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

-- Function to get message count
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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_or_create_todays_chat_room(UUID, TEXT, VARCHAR, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION get_or_create_todays_chat_room(UUID, TEXT, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_message_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_message_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bot_settings_options() TO anon;
GRANT EXECUTE ON FUNCTION get_bot_settings_options() TO authenticated;

-- ===================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ===================================

COMMENT ON TABLE users IS 'User accounts with OAuth and email authentication support';
COMMENT ON TABLE chat_rooms IS 'Daily chat rooms for dream interpretation with configurable bot personalities';
COMMENT ON TABLE messages IS 'Chat messages between users and AI bots';

COMMENT ON COLUMN chat_rooms.bot_gender IS 'Gender of the dream interpretation bot (male/female)';
COMMENT ON COLUMN chat_rooms.bot_style IS 'Style of the dream interpretation bot (eastern/western)';
COMMENT ON COLUMN chat_rooms.date IS 'Date of the chat room (YYYY-MM-DD), one room per user per day';

-- ===================================
-- SETUP COMPLETE
-- ===================================