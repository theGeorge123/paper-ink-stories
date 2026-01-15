-- Create function to deduct credits for hero creation (2 credits)
CREATE OR REPLACE FUNCTION public.deduct_credits_for_hero(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits integer;
BEGIN
  -- Get current credits with lock
  SELECT credits INTO current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF current_credits IS NULL OR current_credits < 2 THEN
    RETURN false;
  END IF;
  
  -- Deduct 2 credits for hero creation
  UPDATE profiles
  SET credits = credits - 2, updated_at = now()
  WHERE id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -2, 'hero_creation', 'Created a new hero character');
  
  RETURN true;
END;
$$;