-- Make hero-portraits bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'hero-portraits';

-- Create policy to allow public read access to hero portraits
CREATE POLICY "Public read access for hero portraits"
ON storage.objects
FOR SELECT
USING (bucket_id = 'hero-portraits');