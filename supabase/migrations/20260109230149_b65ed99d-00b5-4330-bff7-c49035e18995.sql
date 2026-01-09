-- Fix the overly permissive policy - replace with proper user-based access
DROP POLICY IF EXISTS "Service role can manage image assets" ON public.image_assets;
DROP POLICY IF EXISTS "Users can view their own image assets" ON public.image_assets;

-- Users can view their own image assets
CREATE POLICY "Users can view their own image assets" 
ON public.image_assets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own image assets
CREATE POLICY "Users can insert their own image assets" 
ON public.image_assets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);