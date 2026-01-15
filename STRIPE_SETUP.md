# Stripe Setup Guide for Paper & Ink Stories Credits System

This guide will help you set up Stripe payment integration for the credits system and subscription functionality.

## Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Access to your Supabase project
- Environment variables configuration access

## Step 1: Create Stripe Products and Prices

### 1.1 Create Subscription Product

1. Log in to your Stripe Dashboard
2. Navigate to **Products** → **Add Product**
3. Create a subscription product:
   - **Name**: Premium Unlimited Monthly
   - **Description**: Unlimited heroes and stories per month
   - **Pricing**: Recurring
   - **Price**: €7.90 EUR per month
   - **Billing period**: Monthly
4. Copy the **Price ID** (starts with `price_...`)

### 1.2 Create Credit Packages (Optional)

The system automatically creates Stripe prices for credit packages on first purchase. The default packages are:
- 10 Credits for €7.90
- 25 Credits for €17.90
- 50 Credits for €32.90
- 100 Credits for €59.90

You can modify these in the database migration file: `supabase/migrations/20260115000000_add_credits_system.sql`

## Step 2: Set Up Stripe Webhook

### 2.1 Create Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_...`)

## Step 3: Configure Environment Variables

### 3.1 Supabase Edge Function Secrets

Set the following secrets in your Supabase project:

```bash
# Navigate to your Supabase project settings → Edge Functions

# Stripe Secret Key (from Stripe Dashboard → Developers → API Keys)
STRIPE_SECRET_KEY=sk_live_... # Use sk_test_... for testing

# Stripe Webhook Secret (from Step 2.1)
STRIPE_WEBHOOK_SECRET=whsec_...
```

You can set these using the Supabase CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3.2 Frontend Environment Variables

Add to your `.env` file (or environment variables in your hosting platform):

```bash
# Stripe Subscription Price ID (from Step 1.1)
VITE_STRIPE_SUBSCRIPTION_PRICE_ID=price_...
```

## Step 4: Deploy Edge Functions

Deploy the Stripe-related Edge Functions to Supabase:

```bash
# Deploy create-checkout function
supabase functions deploy create-checkout

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook

# Deploy manage-subscription function
supabase functions deploy manage-subscription
```

## Step 5: Run Database Migration

Apply the credits system migration:

```bash
supabase db push
```

Or if you're using migrations:

```bash
supabase migration up
```

This will:
- Add `credits` column to profiles table
- Create `credit_transactions` table
- Create `subscriptions` table
- Create `credit_packages` table
- Add database functions for credit management
- Set up RLS policies

## Step 6: Test the Integration

### 6.1 Test Mode

1. Use Stripe test mode API keys (start with `sk_test_...`)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date and any CVC

### 6.2 Testing Subscription

1. Go to `/pricing` page
2. Click "Subscribe Now"
3. Complete checkout with test card
4. Verify:
   - User is redirected to dashboard with success message
   - Subscription appears in Stripe Dashboard
   - User's dashboard shows "Premium Member" badge
   - User can create unlimited heroes and stories

### 6.3 Testing Credit Purchase

1. Go to `/pricing` page
2. Switch to "Buy Credits" tab
3. Select a credit package
4. Complete checkout with test card
5. Verify:
   - Credits are added to user's balance
   - Transaction appears in `credit_transactions` table
   - Credits display updates on dashboard

### 6.4 Testing Credit Deduction

1. Ensure user has less than 2 credits and no subscription
2. Try to create a hero
3. Verify error message appears prompting to purchase credits
4. Purchase credits or subscribe
5. Successfully create hero and verify 2 credits deducted

## Step 7: Go Live

### 7.1 Switch to Live Mode

1. Get your **Live API keys** from Stripe Dashboard
2. Update environment variables with live keys:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_... # Create new webhook for live mode
   ```
3. Create a new webhook endpoint for live mode (repeat Step 2)
4. Deploy edge functions again with live keys

### 7.2 Update Pricing

If needed, update the subscription price or credit package prices:

1. Create new prices in Stripe Dashboard
2. Update `VITE_STRIPE_SUBSCRIPTION_PRICE_ID` environment variable
3. Update credit packages in database if needed

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook signing secret is correct
2. Verify webhook URL is accessible
3. Check Edge Function logs in Supabase Dashboard
4. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to https://[YOUR_PROJECT_REF].supabase.co/functions/v1/stripe-webhook
   ```

### Credits Not Being Added

1. Check `credit_transactions` table for transaction records
2. Verify webhook is processing `checkout.session.completed` events
3. Check Edge Function logs for errors
4. Ensure database function `add_credits` is working:
   ```sql
   SELECT add_credits(
     '[user_id]'::uuid,
     10,
     'purchase',
     'Test purchase',
     'pi_test_123',
     NULL
   );
   ```

### Subscription Not Working

1. Verify subscription webhook events are being received
2. Check `subscriptions` table for subscription record
3. Test the `has_active_subscription` function:
   ```sql
   SELECT has_active_subscription('[user_id]'::uuid);
   ```
4. Check that subscription status is 'active' and period end is in the future

## Security Considerations

1. **Never expose secret keys** in frontend code
2. Use **Stripe test mode** during development
3. Implement **rate limiting** on checkout endpoints
4. Validate all **webhook signatures**
5. Use **RLS policies** to protect sensitive data
6. **Monitor** Stripe Dashboard for suspicious activity

## Support

For Stripe-specific issues:
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com

For integration issues:
- Check Supabase Edge Function logs
- Review database migration logs
- Test with Stripe CLI for webhook debugging

## Credits System Overview

### Credit Costs
- **Create Hero**: 2 credits
- **Generate Story**: 1 credit

### Free Credits
- New accounts start with **5 free credits**
- Enough for 2 heroes + 1 story

### Subscription Benefits
- Unlimited hero creation
- Unlimited story generation
- No credit deduction
- Priority support

### Credit Packages
Default packages (can be customized):
- 10 credits: €7.90
- 25 credits: €17.90
- 50 credits: €32.90
- 100 credits: €59.90

## Database Schema

### Tables Created

#### `credit_transactions`
Tracks all credit operations (purchases, usage, bonuses)

#### `subscriptions`
Stores Stripe subscription details

#### `credit_packages`
Defines available credit packages for purchase

#### `profiles` (modified)
Added columns:
- `credits`: Current credit balance
- `total_credits_purchased`: Lifetime credit purchases

### Functions Created

- `deduct_credits_for_hero(user_id)`: Deducts 2 credits for hero creation
- `deduct_credits_for_story(user_id)`: Deducts 1 credit for story generation
- `add_credits(...)`: Adds credits to user account
- `has_active_subscription(user_id)`: Checks if user has active subscription

## API Endpoints

### `/functions/v1/create-checkout`
Creates Stripe checkout session for subscriptions or credit purchases

**Request:**
```json
{
  "type": "subscription" | "credits",
  "priceId": "price_...", // For subscriptions
  "packageId": "uuid", // For credit purchases
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```

### `/functions/v1/stripe-webhook`
Handles Stripe webhook events (internal, called by Stripe)

### `/functions/v1/manage-subscription`
Manages user subscriptions (cancel, reactivate, billing portal)

**Request:**
```json
{
  "action": "cancel" | "reactivate" | "portal"
}
```

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Stripe keys configured correctly
- [ ] Webhook endpoint created and verified
- [ ] Edge functions deployed
- [ ] New user receives 5 free credits
- [ ] Hero creation deducts 2 credits
- [ ] Story generation deducts 1 credit
- [ ] Credit purchase flow works
- [ ] Subscription flow works
- [ ] Subscription grants unlimited access
- [ ] Credit balance displays correctly
- [ ] Insufficient credits error handled properly
- [ ] Pricing page loads and displays packages
- [ ] Credits display shows on dashboard

## Maintenance

### Monthly Tasks
- Review transaction logs for anomalies
- Check failed payments and follow up
- Monitor subscription churn rate
- Update pricing if needed

### Quarterly Tasks
- Review credit package pricing
- Analyze usage patterns
- Optimize conversion funnel
- Update documentation

---

Last Updated: 2026-01-15
Version: 1.0
