-- Generated Images Table for Dream Visualization
-- This table stores records of generated images for user dreams

-- Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_prompt TEXT,
    bot_gender VARCHAR(10) NOT NULL CHECK (bot_gender IN ('male', 'female')),
    bot_style VARCHAR(10) NOT NULL CHECK (bot_style IN ('eastern', 'western')),
    generation_model VARCHAR(50) DEFAULT 'dall-e-3',
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_chat_room_id ON generated_images(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_is_premium ON generated_images(is_premium);

-- Enable Row Level Security
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own generated images" ON generated_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated images" ON generated_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated images" ON generated_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated images" ON generated_images
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_generated_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_generated_images_updated_at ON generated_images;
CREATE TRIGGER trigger_update_generated_images_updated_at
    BEFORE UPDATE ON generated_images
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_images_updated_at();

-- Add comment
COMMENT ON TABLE generated_images IS 'Stores records of AI-generated dream visualization images';