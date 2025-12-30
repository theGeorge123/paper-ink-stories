-- Add preferred_language column to characters table
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';