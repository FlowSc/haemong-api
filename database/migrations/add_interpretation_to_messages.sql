-- Add interpretation column to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS interpretation BOOLEAN DEFAULT FALSE;

-- Add index for better query performance when filtering by interpretation
CREATE INDEX IF NOT EXISTS idx_messages_interpretation 
ON messages(interpretation);

-- Update existing bot messages to set interpretation = true for actual dream interpretations
-- This is a conservative approach - you may need to adjust based on your specific logic
UPDATE messages 
SET interpretation = TRUE 
WHERE type = 'bot' 
AND content LIKE '%해몽%' 
OR content LIKE '%꿈%해석%'
OR content LIKE '%의미%';