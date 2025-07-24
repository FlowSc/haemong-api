-- Update Generated Images Table - Remove message_id column and recreate policies
-- This script safely updates the existing generated_images table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can insert their own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can update their own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can delete their own generated images" ON generated_images;

-- Remove message_id column if it exists
ALTER TABLE generated_images DROP COLUMN IF EXISTS message_id;

-- Recreate RLS policies
CREATE POLICY "Users can view their own generated images" ON generated_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated images" ON generated_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated images" ON generated_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated images" ON generated_images
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE generated_images IS 'Stores records of AI-generated dream visualization images (chat room based)';