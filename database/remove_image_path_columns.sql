-- Remove image_path columns from tables as they are no longer needed
-- All image URLs are now permanent Supabase Storage URLs

-- Remove image_path from generated_images table
ALTER TABLE generated_images 
DROP COLUMN IF EXISTS image_path;

-- Remove image_path from posts table (community feature)
ALTER TABLE posts 
DROP COLUMN IF EXISTS image_path;