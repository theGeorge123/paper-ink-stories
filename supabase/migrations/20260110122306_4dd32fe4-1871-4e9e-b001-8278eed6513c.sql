-- Make hero-portraits bucket public so images display on dashboard
UPDATE storage.buckets 
SET public = true 
WHERE id = 'hero-portraits';

-- Allow anyone to view hero portrait images (public bucket)
CREATE POLICY "Public read access for hero portraits"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-portraits');