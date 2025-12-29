-- Create hero-portraits storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-portraits', 'hero-portraits', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hero-portraits bucket
CREATE POLICY "Anyone can view hero portraits"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'hero-portraits');

CREATE POLICY "Authenticated users can upload hero portraits"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'hero-portraits' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own hero portraits"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'hero-portraits' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own hero portraits"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'hero-portraits' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );