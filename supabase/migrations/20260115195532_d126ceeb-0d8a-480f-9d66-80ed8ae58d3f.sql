-- Add credits column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 5;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status text NOT NULL DEFAULT 'inactive',
  plan_type text NOT NULL DEFAULT 'monthly',
  price_amount integer DEFAULT 0,
  currency text DEFAULT 'EUR',
  credits_per_period integer DEFAULT 0,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscription policies
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create credit_packages table for one-time purchases
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  credits integer NOT NULL,
  price_amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  stripe_price_id text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on credit_packages (public read)
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packages"
  ON public.credit_packages
  FOR SELECT
  USING (is_active = true);

-- Create credit_transactions table for history
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  description text,
  stripe_payment_intent_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Function to add credits
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_description text DEFAULT NULL,
  p_stripe_payment_intent_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user credits
  UPDATE profiles 
  SET credits = credits + p_amount,
      updated_at = now()
  WHERE id = p_user_id;
  
  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, transaction_type, description, stripe_payment_intent_id)
  VALUES (p_user_id, p_amount, p_transaction_type, p_description, p_stripe_payment_intent_id);
END;
$$;

-- Insert default credit packages
-- Pricing strategy: €0.80/credit for small, €0.60/credit for medium, €0.50/credit for large
INSERT INTO public.credit_packages (name, credits, price_amount, currency, sort_order) VALUES
  ('Starter Pack', 10, 799, 'EUR', 1),
  ('Family Pack', 25, 1499, 'EUR', 2),
  ('Adventure Bundle', 50, 2499, 'EUR', 3),
  ('Story Lover', 100, 4499, 'EUR', 4)
ON CONFLICT DO NOTHING;

-- Update handle_new_user function to give 5 free credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, language, credits)
  VALUES (new.id, 'en', 5);
  RETURN new;
END;
$$;