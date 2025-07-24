-- =====================================================
-- Partition Management Functions
-- Automated partition creation and maintenance
-- =====================================================

-- 1. Function to create new monthly partition
CREATE OR REPLACE FUNCTION create_monthly_partition(
  target_date DATE DEFAULT CURRENT_DATE
) RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  year_month TEXT;
BEGIN
  -- Calculate partition boundaries
  start_date := DATE_TRUNC('month', target_date);
  end_date := start_date + INTERVAL '1 month';
  year_month := TO_CHAR(start_date, 'YYYY_MM');
  partition_name := 'messages_' || year_month;

  -- Check if partition already exists
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = partition_name
  ) THEN
    RETURN 'Partition ' || partition_name || ' already exists';
  END IF;

  -- Create partition
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

-- 2. Function to create partitions for next N months
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

-- 3. Function to drop old partitions (data retention policy)
CREATE OR REPLACE FUNCTION drop_old_partitions(
  months_to_keep INTEGER DEFAULT 12
) RETURNS TEXT[] AS $$
DECLARE
  partition_record RECORD;
  cutoff_date DATE;
  result TEXT[] := '{}';
  dropped_count INTEGER := 0;
BEGIN
  cutoff_date := DATE_TRUNC('month', CURRENT_DATE) - (months_to_keep || ' months')::INTERVAL;
  
  -- Find partitions older than cutoff date
  FOR partition_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE tablename LIKE 'messages_20%'
    AND tablename ~ '^messages_\d{4}_\d{2}$'
  LOOP
    -- Extract date from partition name (messages_YYYY_MM)
    DECLARE
      partition_date DATE;
      year_str TEXT;
      month_str TEXT;
    BEGIN
      year_str := substring(partition_record.tablename from 10 for 4);
      month_str := substring(partition_record.tablename from 15 for 2);
      partition_date := (year_str || '-' || month_str || '-01')::DATE;
      
      IF partition_date < cutoff_date THEN
        -- Archive or drop old partition
        EXECUTE 'DROP TABLE ' || quote_ident(partition_record.tablename);
        result := array_append(result, 'Dropped partition: ' || partition_record.tablename);
        dropped_count := dropped_count + 1;
      END IF;
    END;
  END LOOP;
  
  IF dropped_count = 0 THEN
    result := array_append(result, 'No old partitions found to drop');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get partition statistics
CREATE OR REPLACE FUNCTION get_partition_stats()
RETURNS TABLE(
  partition_name TEXT,
  message_count BIGINT,
  size_pretty TEXT,
  oldest_message TIMESTAMP WITH TIME ZONE,
  newest_message TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  partition_record RECORD;
BEGIN
  FOR partition_record IN
    SELECT tablename
    FROM pg_tables
    WHERE tablename LIKE 'messages_20%'
    AND tablename ~ '^messages_\d{4}_\d{2}$'
    ORDER BY tablename
  LOOP
    RETURN QUERY
    EXECUTE format('
      SELECT 
        %L::TEXT as partition_name,
        COUNT(*)::BIGINT as message_count,
        pg_size_pretty(pg_total_relation_size(%L))::TEXT as size_pretty,
        MIN(created_at) as oldest_message,
        MAX(created_at) as newest_message
      FROM %I
    ', partition_record.tablename, partition_record.tablename, partition_record.tablename);
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to optimize partition maintenance (run monthly)
CREATE OR REPLACE FUNCTION maintain_message_partitions()
RETURNS TEXT AS $$
DECLARE
  result TEXT := '';
  future_results TEXT[];
  cleanup_results TEXT[];
BEGIN
  -- Create partitions for next 6 months
  SELECT create_future_partitions(6) INTO future_results;
  result := result || 'Future partitions: ' || array_to_string(future_results, ', ') || E'\n';
  
  -- Drop partitions older than 12 months
  SELECT drop_old_partitions(12) INTO cleanup_results;
  result := result || 'Cleanup: ' || array_to_string(cleanup_results, ', ') || E'\n';
  
  -- Analyze all message partitions for query planner
  EXECUTE 'ANALYZE messages';
  result := result || 'Analysis completed for all partitions';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Create a cron job function (if pg_cron extension is available)
-- This would need to be scheduled externally or via pg_cron
CREATE OR REPLACE FUNCTION schedule_partition_maintenance()
RETURNS TEXT AS $$
BEGIN
  -- This is a placeholder for cron job setup
  -- In production, you would schedule this via:
  -- SELECT cron.schedule('partition-maintenance', '0 2 1 * *', 'SELECT maintain_message_partitions();');
  
  RETURN 'Partition maintenance should be scheduled to run monthly (e.g., 1st day of month at 2 AM)';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Usage Examples and Initial Setup
-- =====================================================

-- Create partitions for the current year and next 6 months
SELECT create_future_partitions(6);

-- Get current partition statistics
SELECT * FROM get_partition_stats();

-- Manual maintenance run
SELECT maintain_message_partitions();

-- =====================================================
-- Monitoring Queries
-- =====================================================

-- Check partition pruning effectiveness
CREATE OR REPLACE VIEW partition_pruning_check AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  (SELECT COUNT(*) FROM pg_stat_user_tables WHERE relname = tablename) as access_count
FROM pg_tables 
WHERE tablename LIKE 'messages_%'
ORDER BY tablename;

-- Check query performance across partitions
CREATE OR REPLACE FUNCTION analyze_query_performance(
  chat_room_uuid UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  execution_time_ms NUMERIC,
  rows_examined BIGINT,
  partitions_accessed TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    SELECT * FROM messages 
    WHERE chat_room_id = %L
    AND created_at >= NOW() - INTERVAL ''%s days''
    ORDER BY created_at DESC
    LIMIT 100
  ', chat_room_uuid, days_back);
END;
$$ LANGUAGE plpgsql;