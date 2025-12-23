-- Add age_band column to characters table for age-appropriate story generation
ALTER TABLE public.characters
ADD COLUMN age_band text NOT NULL DEFAULT '6-8';

-- Add a comment explaining the valid values
COMMENT ON COLUMN public.characters.age_band IS 'Age band for story content: 3-5, 6-8, or 9-12';