-- Add image_url column to messages table for dream visualization
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for image_url (for filtering messages with images)
CREATE INDEX IF NOT EXISTS idx_messages_image_url ON messages(image_url) WHERE image_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN messages.image_url IS 'URL of generated dream visualization image (for bot messages only)';

-- Create function to get messages with images
CREATE OR REPLACE FUNCTION get_messages_with_images(p_chat_room_id UUID)
RETURNS TABLE (
  id UUID,
  chat_room_id UUID,
  type VARCHAR(10),
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.chat_room_id,
    m.type,
    m.content,
    m.image_url,
    m.created_at
  FROM messages m
  WHERE m.chat_room_id = p_chat_room_id 
    AND m.image_url IS NOT NULL
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_messages_with_images(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_messages_with_images(UUID) TO authenticated;

-- Create function to get latest dream images for user
CREATE OR REPLACE FUNCTION get_user_dream_images(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  message_id UUID,
  chat_room_title VARCHAR(255),
  image_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    cr.title as chat_room_title,
    m.image_url,
    m.created_at
  FROM messages m
  JOIN chat_rooms cr ON m.chat_room_id = cr.id
  WHERE cr.user_id = p_user_id 
    AND m.type = 'bot'
    AND m.image_url IS NOT NULL
    AND cr.is_active = true
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_dream_images(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_user_dream_images(UUID, INTEGER) TO authenticated;