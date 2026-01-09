-- Add UPDATE policy for pages table to allow upsert operations
CREATE POLICY "Users can update own pages" 
ON public.pages 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM stories 
  JOIN characters ON characters.id = stories.character_id 
  WHERE stories.id = pages.story_id 
  AND characters.user_id = auth.uid()
));