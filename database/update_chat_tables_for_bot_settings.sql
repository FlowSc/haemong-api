-- Add bot settings columns to chat_rooms table
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS bot_gender VARCHAR(10) NOT NULL DEFAULT 'female' CHECK (bot_gender IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS bot_style VARCHAR(10) NOT NULL DEFAULT 'eastern' CHECK (bot_style IN ('eastern', 'western'));

-- Create index for bot settings
CREATE INDEX IF NOT EXISTS idx_chat_rooms_bot_settings ON chat_rooms(bot_gender, bot_style);

-- Update existing chat rooms with default bot settings (female, eastern)
UPDATE chat_rooms 
SET 
  bot_gender = 'female',
  bot_style = 'eastern'
WHERE bot_gender IS NULL OR bot_style IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN chat_rooms.bot_gender IS 'Gender of the dream interpretation bot (male/female)';
COMMENT ON COLUMN chat_rooms.bot_style IS 'Style of the dream interpretation bot (eastern/western)';

-- Create function to get bot settings options
CREATE OR REPLACE FUNCTION get_bot_settings_options()
RETURNS JSON AS $$
BEGIN
  RETURN JSON_BUILD_OBJECT(
    'genders', JSON_BUILD_ARRAY(
      JSON_BUILD_OBJECT('value', 'male', 'label', '남성'),
      JSON_BUILD_OBJECT('value', 'female', 'label', '여성')
    ),
    'styles', JSON_BUILD_ARRAY(
      JSON_BUILD_OBJECT('value', 'eastern', 'label', '동양풍'),
      JSON_BUILD_OBJECT('value', 'western', 'label', '서양풍')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_bot_settings_options() TO anon;
GRANT EXECUTE ON FUNCTION get_bot_settings_options() TO authenticated;