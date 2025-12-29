-- Add language and visual anchor to characters
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'nl';

ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS visual_description_anchor TEXT;

-- Create ratings table for user feedback
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  score INT CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ratings_user_story_unique UNIQUE (user_id, story_id)
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies to restrict access to own ratings
CREATE POLICY "Users can read own ratings"
  ON public.ratings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ratings"
  ON public.ratings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
