-- =====================================================
-- Complete Database Reset Script
-- WARNING: This will delete ALL chat and message data
-- =====================================================

-- Disable RLS temporarily to avoid conflicts
ALTER TABLE IF EXISTS messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chat_rooms DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS messages_select_own ON messages;
DROP POLICY IF EXISTS messages_insert_own ON messages;
DROP POLICY IF EXISTS chat_rooms_select_own ON chat_rooms;
DROP POLICY IF EXISTS chat_rooms_insert_own ON chat_rooms;
DROP POLICY IF EXISTS chat_rooms_update_own ON chat_rooms;
DROP POLICY IF EXISTS chat_rooms_delete_own ON chat_rooms;

-- Drop all message partitions if they exist
DROP TABLE IF EXISTS messages_2024_01 CASCADE;
DROP TABLE IF EXISTS messages_2024_02 CASCADE;
DROP TABLE IF EXISTS messages_2024_03 CASCADE;
DROP TABLE IF EXISTS messages_2024_04 CASCADE;
DROP TABLE IF EXISTS messages_2024_05 CASCADE;
DROP TABLE IF EXISTS messages_2024_06 CASCADE;
DROP TABLE IF EXISTS messages_2024_07 CASCADE;
DROP TABLE IF EXISTS messages_2024_08 CASCADE;
DROP TABLE IF EXISTS messages_2024_09 CASCADE;
DROP TABLE IF EXISTS messages_2024_10 CASCADE;
DROP TABLE IF EXISTS messages_2024_11 CASCADE;
DROP TABLE IF EXISTS messages_2024_12 CASCADE;
DROP TABLE IF EXISTS messages_2025_01 CASCADE;
DROP TABLE IF EXISTS messages_2025_02 CASCADE;
DROP TABLE IF EXISTS messages_2025_03 CASCADE;
DROP TABLE IF EXISTS messages_2025_04 CASCADE;
DROP TABLE IF EXISTS messages_2025_05 CASCADE;
DROP TABLE IF EXISTS messages_2025_06 CASCADE;
DROP TABLE IF EXISTS messages_2025_07 CASCADE;
DROP TABLE IF EXISTS messages_2025_08 CASCADE;

-- Drop backup tables if they exist
DROP TABLE IF EXISTS messages_backup CASCADE;
DROP TABLE IF EXISTS messages_partitioned CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;

-- Drop all related indexes (in case they still exist)
DROP INDEX IF EXISTS idx_messages_chat_room_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_messages_type;
DROP INDEX IF EXISTS idx_messages_chat_room_created;
DROP INDEX IF EXISTS idx_messages_type_created;
DROP INDEX IF EXISTS idx_messages_image_url;
DROP INDEX IF EXISTS idx_messages_optimized;

DROP INDEX IF EXISTS idx_chat_rooms_user_id;
DROP INDEX IF EXISTS idx_chat_rooms_date;
DROP INDEX IF EXISTS idx_chat_rooms_user_date;
DROP INDEX IF EXISTS idx_chat_rooms_is_active;

-- Drop utility functions
DROP FUNCTION IF EXISTS get_or_create_todays_chat_room(UUID, TEXT);
DROP FUNCTION IF EXISTS get_message_count(UUID);
DROP FUNCTION IF EXISTS get_recent_messages(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS create_monthly_partition(DATE);
DROP FUNCTION IF EXISTS create_future_partitions(INTEGER);
DROP FUNCTION IF EXISTS drop_old_partitions(INTEGER);
DROP FUNCTION IF EXISTS get_partition_stats();
DROP FUNCTION IF EXISTS maintain_message_partitions();
DROP FUNCTION IF EXISTS schedule_partition_maintenance();
DROP FUNCTION IF EXISTS analyze_query_performance(UUID, INTEGER);

-- Drop views
DROP VIEW IF EXISTS partition_stats;
DROP VIEW IF EXISTS index_usage_stats;
DROP VIEW IF EXISTS partition_pruning_check;

-- Drop triggers
DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;

-- Drop update function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Success message
SELECT 'Database reset completed successfully. All chat and message data has been removed.' as status;