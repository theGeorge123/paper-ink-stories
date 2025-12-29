-- Add image_url to pages table for mid-adventure illustrations
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure a public bucket exists for story imagery
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;
