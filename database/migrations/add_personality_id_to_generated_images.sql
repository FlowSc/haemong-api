-- Add personalityId column to generated_images table
ALTER TABLE generated_images
ADD COLUMN "personalityId" INTEGER NOT NULL DEFAULT 1;

-- Add foreign key constraint
ALTER TABLE generated_images
ADD CONSTRAINT fk_generated_images_personality_id
FOREIGN KEY ("personalityId") REFERENCES bot_personalities(id);

-- Remove default value after adding the column
ALTER TABLE generated_images
ALTER COLUMN "personalityId" DROP DEFAULT;