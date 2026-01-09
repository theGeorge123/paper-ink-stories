-- Add missing columns to image_assets table for hero portrait generation
ALTER TABLE public.image_assets 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS hero_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'hero',
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_image_assets_hero_id ON public.image_assets(hero_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_user_id ON public.image_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_image_assets_type_prompt ON public.image_assets(hero_id, type, prompt_hash);

-- Update RLS policies to allow service role full access
-- The edge function uses service_role key so it bypasses RLS, but let's ensure proper policies exist
DROP POLICY IF EXISTS "Users can view their own image assets" ON public.image_assets;
DROP POLICY IF EXISTS "Users can insert their own image assets" ON public.image_assets;

CREATE POLICY "Users can view their own image assets" 
ON public.image_assets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage image assets"
ON public.image_assets
FOR ALL
USING (true)
WITH CHECK (true);