-- Add pending_choice to characters table for cliffhanger feature
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS pending_choice text;

-- Add generated_options to stories table
ALTER TABLE public.stories
ADD COLUMN IF NOT EXISTS generated_options jsonb;

-- Drop existing foreign key constraints and recreate with ON DELETE CASCADE
-- For stories -> characters
ALTER TABLE public.stories
DROP CONSTRAINT IF EXISTS stories_character_id_fkey;

ALTER TABLE public.stories
ADD CONSTRAINT stories_character_id_fkey
FOREIGN KEY (character_id) REFERENCES public.characters(id)
ON DELETE CASCADE;

-- For pages -> stories
ALTER TABLE public.pages
DROP CONSTRAINT IF EXISTS pages_story_id_fkey;

ALTER TABLE public.pages
ADD CONSTRAINT pages_story_id_fkey
FOREIGN KEY (story_id) REFERENCES public.stories(id)
ON DELETE CASCADE;

-- Add RLS policy for deleting stories (drop if exists first)
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
CREATE POLICY "Users can delete own stories"
ON public.stories
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM characters
  WHERE characters.id = stories.character_id
  AND characters.user_id = auth.uid()
));

-- Add RLS policy for deleting pages (drop if exists first)
DROP POLICY IF EXISTS "Users can delete own pages" ON public.pages;
CREATE POLICY "Users can delete own pages"
ON public.pages
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM stories
  JOIN characters ON characters.id = stories.character_id
  WHERE stories.id = pages.story_id
  AND characters.user_id = auth.uid()
));