-- =====================================================
-- Optimized Chat Tables with Partitioning & Indexing
-- Updated schema for better performance
-- =====================================================

-- Create chat_rooms table (no changes needed - already optimized)
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD format for daily chat rooms
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partitioned messages table (optimized version)
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'bot')),
  content TEXT NOT NULL,
  image_url TEXT, -- Added for image generation feature
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT messages_pkey PRIMARY KEY (id, created_at),
  CONSTRAINT messages_chat_room_fkey 
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

-- =====================================================
-- Optimized Indexes
-- =====================================================

-- Chat rooms indexes (keep existing - already optimal)
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_date ON chat_rooms(date);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_date ON chat_rooms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON chat_rooms(is_active);

-- Messages indexes (optimized composite indexes)
-- Primary index for chat room message queries (Discord-style)
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_created 
  ON messages (chat_room_id, created_at DESC, id);

-- Secondary index for message type filtering
CREATE INDEX IF NOT EXISTS idx_messages_type_created 
  ON messages (type, created_at DESC);

-- Index for image URL queries (premium features)
CREATE INDEX IF NOT EXISTS idx_messages_image_url 
  ON messages (chat_room_id) 
  WHERE image_url IS NOT NULL;

-- =====================================================
-- Monthly Partitions Setup
-- =====================================================

-- 2024 partitions
CREATE TABLE IF NOT EXISTS messages_2024_01 PARTITION OF messages
  FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2024-02-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_02 PARTITION OF messages
  FOR VALUES FROM ('2024-02-01 00:00:00+00') TO ('2024-03-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_03 PARTITION OF messages
  FOR VALUES FROM ('2024-03-01 00:00:00+00') TO ('2024-04-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_04 PARTITION OF messages
  FOR VALUES FROM ('2024-04-01 00:00:00+00') TO ('2024-05-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_05 PARTITION OF messages
  FOR VALUES FROM ('2024-05-01 00:00:00+00') TO ('2024-06-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_06 PARTITION OF messages
  FOR VALUES FROM ('2024-06-01 00:00:00+00') TO ('2024-07-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_07 PARTITION OF messages
  FOR VALUES FROM ('2024-07-01 00:00:00+00') TO ('2024-08-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_08 PARTITION OF messages
  FOR VALUES FROM ('2024-08-01 00:00:00+00') TO ('2024-09-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_09 PARTITION OF messages
  FOR VALUES FROM ('2024-09-01 00:00:00+00') TO ('2024-10-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_10 PARTITION OF messages
  FOR VALUES FROM ('2024-10-01 00:00:00+00') TO ('2024-11-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_11 PARTITION OF messages
  FOR VALUES FROM ('2024-11-01 00:00:00+00') TO ('2024-12-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2024_12 PARTITION OF messages
  FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- 2025 partitions
CREATE TABLE IF NOT EXISTS messages_2025_01 PARTITION OF messages
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2025_02 PARTITION OF messages
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
  
CREATE TABLE IF NOT EXISTS messages_2025_03 PARTITION OF messages
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS messages_2025_04 PARTITION OF messages
  FOR VALUES FROM ('2025-04-01 00:00:00+00') TO ('2025-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS messages_2025_05 PARTITION OF messages
  FOR VALUES FROM ('2025-05-01 00:00:00+00') TO ('2025-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS messages_2025_06 PARTITION OF messages
  FOR VALUES FROM ('2025-06-01 00:00:00+00') TO ('2025-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS messages_2025_07 PARTITION OF messages
  FOR VALUES FROM ('2025-07-01 00:00:00+00') TO ('2025-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS messages_2025_08 PARTITION OF messages
  FOR VALUES FROM ('2025-08-01 00:00:00+00') TO ('2025-09-01 00:00:00+00');

-- =====================================================
-- Triggers and Functions
-- =====================================================

-- Create trigger to automatically update updated_at for chat_rooms
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for user and date (one chat room per user per day)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_date'
  ) THEN
    ALTER TABLE chat_rooms ADD CONSTRAINT unique_user_date 
      UNIQUE (user_id, date) 
      WHERE is_active = true;
  END IF;
END $$;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS chat_rooms_select_own ON chat_rooms;
DROP POLICY IF EXISTS chat_rooms_insert_own ON chat_rooms;
DROP POLICY IF EXISTS chat_rooms_update_own ON chat_rooms;
DROP POLICY IF EXISTS chat_rooms_delete_own ON chat_rooms;
DROP POLICY IF EXISTS messages_select_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;

-- Policies for chat_rooms
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

-- Policies for messages (optimized with indexed joins)
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

-- =====================================================
-- Permissions
-- =====================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- =====================================================
-- Utility Functions (Updated for Partitioned Table)
-- =====================================================

-- Create function to get today's chat room for a user
CREATE OR REPLACE FUNCTION get_or_create_todays_chat_room(
  p_user_id UUID, 
  p_title TEXT DEFAULT NULL
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
    INSERT INTO chat_rooms (user_id, title, date)
    VALUES (p_user_id, room_title, today_date)
    RETURNING id INTO room_id;
  END IF;
  
  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create optimized function to get message count for a chat room
CREATE OR REPLACE FUNCTION get_message_count(p_chat_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
  msg_count INTEGER;
BEGIN
  -- Optimized count query that can use partition pruning
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE chat_room_id = p_chat_room_id;
  
  RETURN COALESCE(msg_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent messages with better performance
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
-- Performance Monitoring Views
-- =====================================================

-- View to monitor partition sizes
CREATE OR REPLACE VIEW partition_stats AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE tablename LIKE 'messages_%'
  AND schemaname = 'public'
ORDER BY size_bytes DESC;

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename LIKE 'messages%'
ORDER BY idx_scan DESC;