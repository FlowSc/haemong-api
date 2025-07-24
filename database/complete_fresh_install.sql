-- =====================================================
-- Complete Fresh Database Installation Script
-- Run this to completely reset and recreate optimized schema
-- =====================================================

-- Step 1: Clean reset (remove everything)
\echo '=== Step 1: Cleaning existing database ==='
\i database/clean_reset_database.sql

-- Step 2: Create fresh optimized schema
\echo '=== Step 2: Creating fresh optimized schema ==='
\i database/fresh_optimized_schema.sql

-- Step 3: Verification queries
\echo '=== Step 3: Verifying installation ==='

-- Check tables exist
SELECT 'Tables created:' as status;
SELECT tablename, schemaname 
FROM pg_tables 
WHERE tablename IN ('chat_rooms', 'messages') 
   OR tablename LIKE 'messages_%'
ORDER BY tablename;

-- Check indexes exist  
SELECT 'Indexes created:' as status;
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE 'messages%' OR tablename = 'chat_rooms'
ORDER BY tablename, indexname;

-- Check partitions exist
SELECT 'Partitions created:' as status;
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE 'messages_20%'
ORDER BY tablename;

-- Check functions exist
SELECT 'Functions created:' as status;  
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN (
  'get_or_create_todays_chat_room',
  'get_message_count', 
  'get_recent_messages',
  'create_monthly_partition',
  'create_future_partitions'
)
ORDER BY proname;

-- Check RLS policies
SELECT 'RLS Policies created:' as status;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'messages')
ORDER BY tablename, policyname;

\echo '=== Installation Complete! ==='
\echo 'You can now use the optimized partitioned messages table.'
\echo 'New partitions will be automatically created as needed.'