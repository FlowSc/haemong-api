-- Add personality_id column to chat_rooms table
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS personality_id INTEGER;

-- Add foreign key constraint to bot_personalities table
ALTER TABLE chat_rooms
ADD CONSTRAINT fk_chat_rooms_personality
FOREIGN KEY (personality_id) 
REFERENCES bot_personalities(id)
ON DELETE SET NULL;

-- Set default personality (2) for existing chat rooms
UPDATE chat_rooms 
SET personality_id = 2 
WHERE personality_id IS NULL;

-- Make personality_id NOT NULL after setting defaults
ALTER TABLE chat_rooms
ALTER COLUMN personality_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_personality_id 
ON chat_rooms(personality_id);