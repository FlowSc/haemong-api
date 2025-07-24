-- Add image_path column to generated_images table for Supabase Storage path
ALTER TABLE generated_images 
ADD COLUMN IF NOT EXISTS image_path TEXT;