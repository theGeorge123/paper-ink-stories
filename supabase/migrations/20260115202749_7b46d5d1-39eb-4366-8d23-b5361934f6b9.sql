-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$;

-- Function to deduct 1 credit for story generation
CREATE OR REPLACE FUNCTION public.deduct_credits_for_story(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits integer;
BEGIN
  -- Get current credits with lock
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF current_credits IS NULL OR current_credits < 1 THEN
    RETURN false;
  END IF;
  
  -- Deduct credit
  UPDATE profiles
  SET credits = credits - 1, updated_at = now()
  WHERE id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -1, 'story_generation', 'Generated a new story');
  
  RETURN true;
END;
$$;