-- =====================================================
-- Database Installation Verification Script
-- =====================================================

\echo '=== Database Installation Verification ==='

-- Check all tables exist
\echo '1. Checking tables...'
SELECT 'Tables:' as check_type, tablename, schemaname 
FROM pg_tables 
WHERE schemaname = 'public'
  AND (tablename IN ('users', 'bot_settings', 'chat_rooms', 'messages', 'videos') 
       OR tablename LIKE 'messages_%')
ORDER BY tablename;

-- Check all indexes exist
\echo '2. Checking indexes...'
SELECT 'Indexes:' as check_type, indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND (tablename LIKE 'messages%' OR tablename IN ('users', 'chat_rooms', 'videos', 'bot_settings'))
ORDER BY tablename, indexname;

-- Check partitions
\echo '3. Checking partitions...'
SELECT 'Partitions:' as check_type, 
       tablename,
       pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE 'messages_20%'
  AND schemaname = 'public'
ORDER BY tablename;

-- Check constraints
\echo '4. Checking constraints...'
SELECT 'Constraints:' as check_type, 
       conname as constraint_name, 
       conrelid::regclass as table_name,
       contype as type
FROM pg_constraint 
WHERE conrelid::regclass::text IN ('users', 'chat_rooms', 'messages', 'videos', 'bot_settings')
ORDER BY table_name, constraint_name;

-- Check functions
\echo '5. Checking functions...'
SELECT 'Functions:' as check_type, proname, pronargs as arg_count
FROM pg_proc 
WHERE proname IN (
  'update_updated_at_column',
  'get_or_create_todays_chat_room',
  'get_message_count', 
  'get_recent_messages',
  'create_monthly_partition',
  'create_future_partitions'
)
ORDER BY proname;

-- Check RLS policies
\echo '6. Checking RLS policies...'
SELECT 'RLS Policies:' as check_type, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers
\echo '7. Checking triggers...'
SELECT 'Triggers:' as check_type, 
       trigger_name, 
       event_object_table as table_name,
       action_timing,
       event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check views
\echo '8. Checking views...'
SELECT 'Views:' as check_type, viewname, schemaname
FROM pg_views 
WHERE schemaname = 'public'
  AND viewname IN ('partition_stats', 'index_usage_stats')
ORDER BY viewname;

-- Test basic functionality
\echo '9. Testing basic functionality...'

-- Test bot_settings data
SELECT 'Bot Settings:' as test_type, gender, style, id
FROM bot_settings
ORDER BY gender, style;

-- Test partition function
SELECT 'Future Partitions Test:' as test_type, unnest(create_future_partitions(1)) as result;

\echo '=== Verification Complete ==='
\echo 'If all checks show expected results, the installation was successful!'

-- Performance test query template (commented out - uncomment to test with real data)
-- \echo '10. Performance test (uncomment when you have test data)...'
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM messages 
-- WHERE chat_room_id = '00000000-0000-0000-0000-000000000000'::uuid
-- ORDER BY created_at DESC 
-- LIMIT 50;