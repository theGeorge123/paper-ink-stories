-- 1. Create hero_creation_log table for rate limiting
CREATE TABLE public.hero_creation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hero_creation_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own creation logs
CREATE POLICY "Users can view own creation logs"
  ON public.hero_creation_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own creation logs (via edge function with service role)
CREATE POLICY "Service role can insert creation logs"
  ON public.hero_creation_log
  FOR INSERT
  WITH CHECK (true);

-- Index for efficient counting
CREATE INDEX idx_hero_creation_log_user_created 
  ON public.hero_creation_log(user_id, created_at DESC);

-- 2. Add hero portrait columns to characters table
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_prompt TEXT,
  ADD COLUMN IF NOT EXISTS hero_image_style TEXT DEFAULT 'storybook_illustration_v1';

-- 3. Add last_summary column to characters if it doesn't exist (for cumulative memory)
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS last_summary TEXT;