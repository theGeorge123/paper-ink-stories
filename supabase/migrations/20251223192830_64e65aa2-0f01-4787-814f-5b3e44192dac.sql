-- Add last_summary column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS last_summary text;

-- Ensure story_state has proper default
ALTER TABLE public.stories ALTER COLUMN story_state SET DEFAULT '{"location": "Home", "inventory": []}'::jsonb;