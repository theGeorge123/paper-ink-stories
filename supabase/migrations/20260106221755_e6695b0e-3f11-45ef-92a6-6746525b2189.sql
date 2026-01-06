-- Fix storage security: Make hero-portraits bucket private
-- This ensures user-generated hero images are only accessible via signed URLs

-- Set hero-portraits to private
UPDATE storage.buckets SET public = false WHERE id = 'hero-portraits';

-- Drop the overly permissive public read policy if it exists
DROP POLICY IF EXISTS "Public read access for hero portraits" ON storage.objects;

-- Ensure the owner-scoped RLS policies are active (these allow authenticated users to manage their own files)
-- The existing policies from migration 20260306000000 should already handle this:
-- - "Users can upload hero portraits"
-- - "Users can update their own hero portraits"  
-- - "Users can view their own hero portraits"
-- - "Users can delete their own hero portraits"