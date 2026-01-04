-- Add image and video URL columns to exercises table
ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN exercises.image_url IS 'URL to an image demonstrating the exercise';
COMMENT ON COLUMN exercises.video_url IS 'URL to a video demonstrating the exercise (YouTube, Vimeo, etc.)';











