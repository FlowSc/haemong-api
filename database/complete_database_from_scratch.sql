-- =====================================================
-- Complete Database Schema Creation from Scratch
-- All tables, indexes, functions, and partitions
-- =====================================================

-- Create update trigger function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Users Table (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  nickname VARCHAR(50),
  provider VARCHAR(20) DEFAULT 'email',
  provider_id VARCHAR(255),
  is_premium BOOLEAN DEFAULT false,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(is_premium);

-- =====================================================
-- Bot Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  style VARCHAR(10) NOT NULL CHECK (style IN ('eastern', 'western')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default bot settings
INSERT INTO bot_settings (gender, style) VALUES
  ('male', 'eastern'),
  ('female', 'eastern'),
  ('male', 'western'),
  ('female', 'western')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Chat Rooms Table
-- =====================================================
CREATE TABLE chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  bot_settings_id UUID REFERENCES bot_settings(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat rooms indexes
CREATE INDEX idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX idx_chat_rooms_date ON chat_rooms(date);
CREATE INDEX idx_chat_rooms_user_date ON chat_rooms(user_id, date);
CREATE INDEX idx_chat_rooms_is_active ON chat_rooms(is_active);

-- Create unique constraint using CREATE UNIQUE INDEX (proper syntax)
CREATE UNIQUE INDEX unique_user_date_active 
ON chat_rooms (user_id, date) 
WHERE is_active = true;

-- Auto-update trigger for chat_rooms
CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Messages Table (Partitioned)
-- =====================================================
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'bot')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Primary key includes partition key
  CONSTRAINT messages_pkey PRIMARY KEY (id, created_at),
  CONSTRAINT messages_chat_room_fkey 
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

-- =====================================================
-- Videos Table (for premium features)
-- =====================================================
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  style JSONB,
  dream_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos indexes
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_chat_room_id ON videos(chat_room_id);
CREATE INDEX idx_videos_created_at ON videos(created_at);

-- =====================================================
-- Create Monthly Partitions for Messages
-- =====================================================

-- 2024 partitions (from July onwards)
CREATE TABLE messages_2024_07 PARTITION OF messages
  FOR VALUES FROM ('2024-07-01 00:00:00+00') TO ('2024-08-01 00:00:00+00');
  
CREATE TABLE messages_2024_08 PARTITION OF messages
  FOR VALUES FROM ('2024-08-01 00:00:00+00') TO ('2024-09-01 00:00:00+00');
  
CREATE TABLE messages_2024_09 PARTITION OF messages
  FOR VALUES FROM ('2024-09-01 00:00:00+00') TO ('2024-10-01 00:00:00+00');
  
CREATE TABLE messages_2024_10 PARTITION OF messages
  FOR VALUES FROM ('2024-10-01 00:00:00+00') TO ('2024-11-01 00:00:00+00');
  
CREATE TABLE messages_2024_11 PARTITION OF messages
  FOR VALUES FROM ('2024-11-01 00:00:00+00') TO ('2024-12-01 00:00:00+00');
  
CREATE TABLE messages_2024_12 PARTITION OF messages
  FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- 2025 partitions
CREATE TABLE messages_2025_01 PARTITION OF messages
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
  
CREATE TABLE messages_2025_02 PARTITION OF messages
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
  
CREATE TABLE messages_2025_03 PARTITION OF messages
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

CREATE TABLE messages_2025_04 PARTITION OF messages
  FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

CREATE TABLE messages_2025_05 PARTITION OF messages
  FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

CREATE TABLE messages_2025_06 PARTITION OF messages
  FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');

CREATE TABLE messages_2025_07 PARTITION OF messages
  FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');

CREATE TABLE messages_2025_08 PARTITION OF messages
  FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');

CREATE TABLE messages_2025_09 PARTITION OF messages
  FOR VALUES FROM ('2025-09-01 00:00:00+00') TO ('2025-10-01 00:00:00+00');

CREATE TABLE messages_2025_10 PARTITION OF messages
  FOR VALUES FROM ('2025-10-01 00:00:00+00') TO ('2025-11-01 00:00:00+00');

CREATE TABLE messages_2025_11 PARTITION OF messages
  FOR VALUES FROM ('2025-11-01 00:00:00+00') TO ('2025-12-01 00:00:00+00');

CREATE TABLE messages_2025_12 PARTITION OF messages
  FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');

-- =====================================================
-- Optimized Indexes for Messages
-- =====================================================

-- Primary composite index (Discord-style optimization)
CREATE INDEX idx_messages_chat_room_created 
  ON messages (chat_room_id, created_at DESC, id);

-- Secondary index for message type filtering
CREATE INDEX idx_messages_type_created 
  ON messages (type, created_at DESC);

-- Partial index for premium image queries
CREATE INDEX idx_messages_with_images 
  ON messages (chat_room_id, created_at DESC) 
  WHERE image_url IS NOT NULL;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY users_select_own ON users 
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY users_update_own ON users 
  FOR UPDATE 
  USING (id = auth.uid());

-- Chat rooms policies
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

-- Messages policies
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

-- Videos policies
CREATE POLICY videos_select_own ON videos 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY videos_insert_own ON videos 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Grant Permissions
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
GRANT SELECT ON bot_settings TO anon;
GRANT SELECT ON bot_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO authenticated;

-- =====================================================
-- Utility Functions
-- =====================================================

-- Drop existing functions first to avoid parameter conflicts
DROP FUNCTION IF EXISTS get_or_create_todays_chat_room(UUID, TEXT);
DROP FUNCTION IF EXISTS get_message_count(UUID);
DROP FUNCTION IF EXISTS get_recent_messages(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS create_monthly_partition(DATE);
DROP FUNCTION IF EXISTS create_future_partitions(INTEGER);

-- Get or create today's chat room
CREATE OR REPLACE FUNCTION get_or_create_todays_chat_room(
  p_user_id UUID, 
  p_title TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  today_date DATE := CURRENT_DATE;
  room_title TEXT := COALESCE(p_title, today_date::TEXT || ' 꿈 해몽');
  default_bot_settings_id UUID;
BEGIN
  -- Get default bot settings (male, eastern)
  SELECT id INTO default_bot_settings_id 
  FROM bot_settings 
  WHERE gender = 'male' AND style = 'eastern' 
  LIMIT 1;

  -- Try to find existing room for today
  SELECT id INTO room_id
  FROM chat_rooms
  WHERE user_id = p_user_id 
    AND date = today_date 
    AND is_active = true;
  
  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (user_id, title, date, bot_settings_id)
    VALUES (p_user_id, room_title, today_date, default_bot_settings_id)
    RETURNING id INTO room_id;
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get message count
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

-- Get recent messages with pagination
CREATE OR REPLACE FUNCTION get_recent_messages(
  p_chat_room_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  chat_room_id UUID,
  type VARCHAR(10),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.chat_room_id, m.type, m.content, m.image_url, m.created_at
  FROM messages m
  WHERE m.chat_room_id = p_chat_room_id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Partition Management Functions
-- =====================================================

-- Create new monthly partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
  target_date DATE DEFAULT CURRENT_DATE
) RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  year_month TEXT;
BEGIN
  start_date := DATE_TRUNC('month', target_date);
  end_date := start_date + INTERVAL '1 month';
  year_month := TO_CHAR(start_date, 'YYYY_MM');
  partition_name := 'messages_' || year_month;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = partition_name) THEN
    RETURN 'Partition ' || partition_name || ' already exists';
  END IF;

  EXECUTE format(
    'CREATE TABLE %I PARTITION OF messages 
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    start_date || ' 00:00:00+00',
    end_date || ' 00:00:00+00'
  );

  RETURN 'Created partition: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Create future partitions
CREATE OR REPLACE FUNCTION create_future_partitions(
  months_ahead INTEGER DEFAULT 6
) RETURNS TEXT[] AS $$
DECLARE
  result TEXT[] := '{}';
  i INTEGER;
  target_date DATE;
  partition_result TEXT;
BEGIN
  FOR i IN 1..months_ahead LOOP
    target_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
    SELECT create_monthly_partition(target_date) INTO partition_result;
    result := array_append(result, partition_result);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Performance Monitoring Views
-- =====================================================

-- Monitor partition sizes
CREATE VIEW partition_stats AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE tablename LIKE 'messages_%'
  AND schemaname = 'public'
ORDER BY size_bytes DESC;

-- Monitor index usage
CREATE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename LIKE 'messages%' OR tablename IN ('chat_rooms', 'users', 'videos')
ORDER BY idx_scan DESC;

-- =====================================================
-- Initial Setup Complete
-- =====================================================

-- Create future partitions automatically
SELECT create_future_partitions(6);

-- Success message
SELECT 'Complete database schema created successfully!' as status,
       'All tables, indexes, partitions, and functions are ready' as details;