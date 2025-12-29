-- Create storage bucket for story images (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-images', 'story-images', false)
ON CONFLICT (id) DO NOTHING;

-- Create image_assets table for caching generated images
CREATE TABLE IF NOT EXISTS public.image_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_hash TEXT NOT NULL,
  storage_bucket TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for prompt hash lookups
CREATE INDEX IF NOT EXISTS idx_image_assets_prompt_hash ON public.image_assets(prompt_hash);

-- Enable RLS on image_assets
ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;

-- RLS policy: Service role only (no direct user access needed, edge functions use service key)
CREATE POLICY "Service role access only" 
ON public.image_assets 
FOR ALL
USING (auth.role() = 'service_role');

-- Add image_url column to pages table
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Storage policies for story-images bucket
CREATE POLICY "Users can view own story images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'story-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can insert story images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-images'
  AND auth.role() = 'service_role'
);

CREATE POLICY "Service role can update story images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'story-images'
  AND auth.role() = 'service_role'
);

-- Make hero-portraits bucket private and add proper policies
UPDATE storage.buckets SET public = false WHERE id = 'hero-portraits';

-- Add RLS policy for hero-portraits (users can view their own)
CREATE POLICY "Users can view own hero portraits"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'hero-portraits' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can manage hero portraits"
ON storage.objects FOR ALL
USING (
  bucket_id = 'hero-portraits'
  AND auth.role() = 'service_role'
);