-- Create ratings table with correct RLS policies
-- This ensures ownership is verified through the characters table

-- Create the ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ratings_user_story_unique UNIQUE (user_id, story_id)
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can insert ratings for their stories" ON public.ratings;
DROP POLICY IF EXISTS "Users can update ratings for their stories" ON public.ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON public.ratings;

-- SELECT: Users can read their own ratings
CREATE POLICY "Users can read own ratings"
  ON public.ratings
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can rate stories they own (through characters)
CREATE POLICY "Users can insert ratings for their stories"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      JOIN public.characters c ON c.id = s.character_id
      WHERE s.id = story_id AND c.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own ratings for their own stories
CREATE POLICY "Users can update ratings for their stories"
  ON public.ratings
  FOR UPDATE
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

-- DELETE: Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
  ON public.ratings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();