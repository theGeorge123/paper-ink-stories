-- SECURITY FIX: Revoke execute permissions on credit functions from authenticated users
-- These functions should ONLY be callable from edge functions with service role

-- 1. Revoke execute permissions on add_credits (only callable from stripe-webhook)
REVOKE EXECUTE ON FUNCTION public.add_credits FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_credits FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_credits FROM public;

-- 2. Revoke execute permissions on deduct_credits_for_hero (only callable from create-hero edge function)
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_hero FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_hero FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_hero FROM public;

-- 3. Revoke execute permissions on deduct_credits_for_story (only callable from generate-page edge function)
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_story FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_story FROM anon;
REVOKE EXECUTE ON FUNCTION public.deduct_credits_for_story FROM public;

-- 4. Add user validation to has_active_subscription (keep callable but restrict to own user)
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow checking own subscription or service role
  IF p_user_id != auth.uid() AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Cannot check other users subscription status';
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$;

-- 5. Enable pgcrypto extension for secure PIN hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Add hashed PIN column and remove plain integer PIN
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_pin_hash TEXT;

-- 7. Drop the plain integer parent_pin column (currently unused, no data to migrate)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS parent_pin;

-- 8. Create secure PIN verification function (server-side only)
CREATE OR REPLACE FUNCTION public.verify_parent_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash TEXT;
BEGIN
  -- Only service role can verify PINs (for edge functions)
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'PIN verification only allowed from server';
  END IF;
  
  SELECT parent_pin_hash INTO v_pin_hash
  FROM profiles WHERE id = p_user_id;
  
  IF v_pin_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN crypt(p_pin, v_pin_hash) = v_pin_hash;
END;
$$;

-- Revoke client access to PIN verification
REVOKE EXECUTE ON FUNCTION public.verify_parent_pin FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_parent_pin FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_parent_pin FROM public;

-- 9. Create secure PIN setting function (server-side only)
CREATE OR REPLACE FUNCTION public.set_parent_pin(p_user_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service role can set PINs (for edge functions)
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'PIN setting only allowed from server';
  END IF;
  
  -- Validate PIN is 4-6 digits
  IF p_pin IS NULL OR NOT (p_pin ~ '^[0-9]{4,6}$') THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;
  
  UPDATE profiles
  SET parent_pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Revoke client access to PIN setting
REVOKE EXECUTE ON FUNCTION public.set_parent_pin FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_parent_pin FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_parent_pin FROM public;

-- 10. Fix credit_packages RLS to require authentication (hide Stripe price IDs from public)
DROP POLICY IF EXISTS "Anyone can view active credit packages" ON public.credit_packages;

CREATE POLICY "Authenticated users can view active credit packages" 
ON public.credit_packages 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 11. Create unsubscribe_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS public.unsubscribe_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL DEFAULT 'all',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on unsubscribe_tokens
ALTER TABLE public.unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can manage tokens
CREATE POLICY "Service role can manage unsubscribe tokens" 
ON public.unsubscribe_tokens 
FOR ALL 
TO authenticated
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_expires ON public.unsubscribe_tokens(expires_at);