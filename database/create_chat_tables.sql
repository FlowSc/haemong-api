-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD format for daily chat rooms
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('user', 'bot')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_id ON chat_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_date ON chat_rooms(date);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_date ON chat_rooms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON chat_rooms(is_active);

CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

-- Create trigger to automatically update updated_at for chat_rooms
CREATE TRIGGER update_chat_rooms_updated_at 
  BEFORE UPDATE ON chat_rooms 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for user and date (one chat room per user per day)
ALTER TABLE chat_rooms ADD CONSTRAINT unique_user_date 
  UNIQUE (user_id, date) 
  WHERE is_active = true;

-- Add RLS (Row Level Security) policies
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

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

-- Policies for messages
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- Create function to get today's chat room for a user
CREATE OR REPLACE FUNCTION get_or_create_todays_chat_room(p_user_id UUID, p_title TEXT DEFAULT NULL)
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

-- Create function to get message count for a chat room
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