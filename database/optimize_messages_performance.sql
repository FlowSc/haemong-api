-- =====================================================
-- Messages Table Performance Optimization
-- - Composite Index Optimization
-- - Monthly Partitioning Implementation
-- =====================================================

-- 1. Create backup of existing messages table
CREATE TABLE messages_backup AS SELECT * FROM messages;

-- 2. Drop existing inefficient indexes
DROP INDEX IF EXISTS idx_messages_chat_room_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_type;

-- 3. Create new partitioned messages table
CREATE TABLE messages_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  chat_room_id UUID NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'bot')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT messages_partitioned_pkey PRIMARY KEY (id, created_at),
  CONSTRAINT messages_partitioned_chat_room_fkey 
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

-- 4. Create optimized composite indexes on partitioned table
-- Primary index for chat room message queries (most common)
CREATE INDEX idx_messages_chat_room_created ON messages_partitioned (chat_room_id, created_at DESC, id);

-- Secondary index for message type filtering
CREATE INDEX idx_messages_type_created ON messages_partitioned (type, created_at DESC);

-- Index for image URL queries (for premium features)
CREATE INDEX idx_messages_image_url ON messages_partitioned (chat_room_id) 
WHERE image_url IS NOT NULL;

-- 5. Create monthly partitions (starting from current month)
-- 2024 partitions
CREATE TABLE messages_2024_01 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2024-02-01 00:00:00+00');
  
CREATE TABLE messages_2024_02 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-02-01 00:00:00+00') TO ('2024-03-01 00:00:00+00');
  
CREATE TABLE messages_2024_03 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-03-01 00:00:00+00') TO ('2024-04-01 00:00:00+00');
  
CREATE TABLE messages_2024_04 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-04-01 00:00:00+00') TO ('2024-05-01 00:00:00+00');
  
CREATE TABLE messages_2024_05 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-05-01 00:00:00+00') TO ('2024-06-01 00:00:00+00');
  
CREATE TABLE messages_2024_06 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-06-01 00:00:00+00') TO ('2024-07-01 00:00:00+00');
  
CREATE TABLE messages_2024_07 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-07-01 00:00:00+00') TO ('2024-08-01 00:00:00+00');
  
CREATE TABLE messages_2024_08 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-08-01 00:00:00+00') TO ('2024-09-01 00:00:00+00');
  
CREATE TABLE messages_2024_09 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-09-01 00:00:00+00') TO ('2024-10-01 00:00:00+00');
  
CREATE TABLE messages_2024_10 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-10-01 00:00:00+00') TO ('2024-11-01 00:00:00+00');
  
CREATE TABLE messages_2024_11 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-11-01 00:00:00+00') TO ('2024-12-01 00:00:00+00');
  
CREATE TABLE messages_2024_12 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2024-12-01 00:00:00+00') TO ('2025-01-01 00:00:00+00');

-- 2025 partitions (first quarter)
CREATE TABLE messages_2025_01 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
  
CREATE TABLE messages_2025_02 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');
  
CREATE TABLE messages_2025_03 PARTITION OF messages_partitioned
  FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

-- 6. Migrate existing data to partitioned table
INSERT INTO messages_partitioned (id, chat_room_id, type, content, image_url, created_at)
SELECT id, chat_room_id, type, content, image_url, created_at 
FROM messages_backup;

-- 7. Drop old table and rename partitioned table
DROP TABLE messages;
ALTER TABLE messages_partitioned RENAME TO messages;

-- 8. Re-enable Row Level Security on new table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 9. Recreate RLS policies for partitioned table
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

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- 11. Clean up backup table (optional - keep for safety)
-- DROP TABLE messages_backup;

-- =====================================================
-- Performance Analysis Queries
-- =====================================================

-- Check partition pruning is working
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM messages 
-- WHERE chat_room_id = 'some-uuid' 
-- AND created_at >= '2024-07-01' 
-- AND created_at < '2024-08-01';

-- Check index usage
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT * FROM messages 
-- WHERE chat_room_id = 'some-uuid' 
-- ORDER BY created_at DESC 
-- LIMIT 50;