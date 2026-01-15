-- Add credits system to the application
-- This migration adds support for a credit-based payment system

-- Add credits column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_credits_purchased INTEGER NOT NULL DEFAULT 0;

-- Create transactions table to track all credit operations
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
  transaction_type TEXT NOT NULL, -- 'purchase', 'subscription', 'usage_hero', 'usage_story', 'refund', 'bonus'
  description TEXT,
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table to track Stripe subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', 'unpaid'
  plan_type TEXT NOT NULL, -- 'monthly'
  price_amount INTEGER NOT NULL, -- in cents/øre
  currency TEXT NOT NULL DEFAULT 'EUR',
  credits_per_period INTEGER NOT NULL DEFAULT 0, -- 0 for unlimited
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit packages table for one-time purchases
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_amount INTEGER NOT NULL, -- in cents/øre
  currency TEXT NOT NULL DEFAULT 'EUR',
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price_amount, currency, is_active, sort_order)
VALUES
  ('10 Credits', 10, 790, 'EUR', true, 1),
  ('25 Credits', 25, 1790, 'EUR', true, 2),
  ('50 Credits', 50, 3290, 'EUR', true, 3),
  ('100 Credits', 100, 5990, 'EUR', true, 4)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS on new tables
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true);

-- RLS Policies for credit_packages
CREATE POLICY "Anyone can view active packages"
  ON credit_packages FOR SELECT
  USING (is_active = true);

-- Function to deduct credits for hero creation (2 credits)
CREATE OR REPLACE FUNCTION deduct_credits_for_hero(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
  v_required_credits INTEGER := 2;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user has enough credits
  IF v_current_credits < v_required_credits THEN
    RETURN false;
  END IF;

  -- Deduct credits
  UPDATE profiles
  SET credits = credits - v_required_credits
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -v_required_credits, 'usage_hero', 'Created a new hero');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct credits for story generation (1 credit)
CREATE OR REPLACE FUNCTION deduct_credits_for_story(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
  v_required_credits INTEGER := 1;
BEGIN
  -- Get current credits with row lock
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user has enough credits
  IF v_current_credits < v_required_credits THEN
    RETURN false;
  END IF;

  -- Deduct credits
  UPDATE profiles
  SET credits = credits - v_required_credits
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -v_required_credits, 'usage_story', 'Generated a new story');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add credits (for purchases and bonuses)
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add credits to user profile
  UPDATE profiles
  SET
    credits = credits + p_amount,
    total_credits_purchased = total_credits_purchased + p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    stripe_payment_intent_id,
    stripe_subscription_id
  )
  VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_description,
    p_stripe_payment_intent_id,
    p_stripe_subscription_id
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_subscription BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > now()
  ) INTO v_has_subscription;

  RETURN v_has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the handle_new_user trigger to give 5 free credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, language, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'language', 'en'),
    5 -- Start with 5 free credits
  )
  ON CONFLICT (id) DO NOTHING;

  -- Record the initial bonus transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
  VALUES (NEW.id, 5, 'bonus', 'Welcome bonus - 5 free credits');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON credit_packages TO authenticated;
GRANT SELECT ON credit_transactions TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_for_hero TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_credits_for_story TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_subscription TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE credit_transactions IS 'Tracks all credit additions and deductions for audit trail';
COMMENT ON TABLE subscriptions IS 'Tracks Stripe subscription details and status';
COMMENT ON TABLE credit_packages IS 'Available credit packages for one-time purchase';
COMMENT ON COLUMN profiles.credits IS 'Current available credits for the user';
COMMENT ON COLUMN profiles.total_credits_purchased IS 'Total credits purchased over lifetime (excludes free credits)';
