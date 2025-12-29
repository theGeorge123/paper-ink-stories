-- Fix over-permissive INSERT policy for hero-portraits storage bucket
-- Users should ONLY be able to upload to their own folder

-- Drop the existing overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can upload hero portraits" ON storage.objects;

-- Create strict path-ownership INSERT policy
CREATE POLICY "Users can upload own hero portraits"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'hero-portraits'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix hero_creation_log INSERT policy - make it strict
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Service role can insert creation logs" ON public.hero_creation_log;

-- Create strict INSERT policy requiring user_id = auth.uid()
CREATE POLICY "Users can insert own hero creation logs"
ON public.hero_creation_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);