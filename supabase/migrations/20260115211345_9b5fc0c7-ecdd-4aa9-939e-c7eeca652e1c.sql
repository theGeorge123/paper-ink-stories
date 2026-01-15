-- Fix broken ratings RLS policies
-- The policies were incorrectly referencing stories.user_id which doesn't exist
-- Correct path: stories -> character_id -> characters.user_id

-- Drop potentially broken policies
DROP POLICY IF EXISTS "Users can insert ratings for their stories" ON public.ratings;
DROP POLICY IF EXISTS "Users can update ratings for their stories" ON public.ratings;

-- Recreate with correct join through characters table
CREATE POLICY "Users can insert ratings for their stories"
  ON public.ratings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      JOIN public.characters c ON c.id = s.character_id
      WHERE s.id = story_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ratings for their stories"
  ON public.ratings FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      JOIN public.characters c ON c.id = s.character_id
      WHERE s.id = story_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      JOIN public.characters c ON c.id = s.character_id
      WHERE s.id = story_id AND c.user_id = auth.uid()
    )
  );