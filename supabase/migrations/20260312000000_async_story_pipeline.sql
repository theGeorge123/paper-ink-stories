-- Ensure stories table has async generation fields
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS age_band TEXT,
  ADD COLUMN IF NOT EXISTS length TEXT,
  ADD COLUMN IF NOT EXISTS total_pages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generating' CHECK (status IN ('generating','ready','failed')),
  ADD COLUMN IF NOT EXISTS error_reason TEXT;

-- Backfill user_id and basic metadata from characters when available
UPDATE public.stories s
SET
  user_id = c.user_id,
  age_band = COALESCE(s.age_band, c.age_band),
  length = COALESCE(s.length, s.length_setting),
  total_pages = COALESCE(s.total_pages, 0)
FROM public.characters c
WHERE s.character_id = c.id
  AND (s.user_id IS NULL OR s.age_band IS NULL OR s.length IS NULL OR s.total_pages IS NULL);

-- Ensure total_pages is not null moving forward
ALTER TABLE public.stories
  ALTER COLUMN total_pages SET NOT NULL;

-- Create story_pages table for progressive storage
CREATE TABLE IF NOT EXISTS public.story_pages (
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT story_pages_unique UNIQUE(story_id, page_index)
);

-- Helpful index for fast lookups
CREATE INDEX IF NOT EXISTS story_pages_story_idx ON public.story_pages (story_id, page_index);

-- Keep RLS aligned with parent stories ownership
ALTER TABLE public.story_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own story pages" ON public.story_pages;
CREATE POLICY "Users can view own story pages" ON public.story_pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      JOIN public.characters c ON c.id = s.character_id
      WHERE s.id = story_pages.story_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own story pages" ON public.story_pages;
CREATE POLICY "Users can insert own story pages" ON public.story_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories s
      JOIN public.characters c ON c.id = s.character_id
      WHERE s.id = story_id
        AND c.user_id = auth.uid()
    )
  );
