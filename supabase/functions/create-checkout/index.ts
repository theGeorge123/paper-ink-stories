import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const checkoutSchema = z.object({
  type: z.enum(["subscription", "credits"]),
  priceId: z.string().min(1).max(200).optional(),
  packageId: z.string().uuid().optional(),
  successUrl: z.string().url().max(2000),
  cancelUrl: z.string().url().max(2000),
}).refine(
  (data) => {
    if (data.type === "subscription") return !!data.priceId;
    if (data.type === "credits") return !!data.packageId;
    return false;
  },
  { message: "priceId required for subscription, packageId required for credits" }
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Parse and validate request body
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const parseResult = checkoutSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { type, priceId, packageId, successUrl, cancelUrl } = parseResult.data;

    // Get or create Stripe customer
    let customerId: string;

    // Check if user already has a Stripe customer ID
    const { data: existingSubscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session based on type
    let sessionParams: Stripe.Checkout.SessionCreateParams;

    if (type === "subscription") {
      // Subscription checkout
      if (!priceId) {
        throw new Error("Price ID is required for subscription");
      }

      sessionParams = {
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        metadata: {
          user_id: user.id,
          type: "subscription",
        },
      };
    } else if (type === "credits") {
      // One-time credit purchase
      if (!packageId) {
        throw new Error("Package ID is required for credit purchase");
      }

      // Get package details from database
      const { data: creditPackage, error: packageError } = await supabaseClient
        .from("credit_packages")
        .select("*")
        .eq("id", packageId)
        .eq("is_active", true)
        .single();

      if (packageError || !creditPackage) {
        throw new Error("Invalid credit package");
      }

      // Create or get Stripe price for this package
      let stripePriceId = creditPackage.stripe_price_id;

      if (!stripePriceId) {
        // Create Stripe product and price
        const product = await stripe.products.create({
          name: creditPackage.name,
          description: `${creditPackage.credits} credits for Paper & Ink Stories`,
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: creditPackage.price_amount,
          currency: creditPackage.currency.toLowerCase(),
        });

        stripePriceId = price.id;

        // Update package with Stripe price ID
        await supabaseClient
          .from("credit_packages")
          .update({ stripe_price_id: stripePriceId })
          .eq("id", packageId);
      }

      sessionParams = {
        customer: customerId,
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        metadata: {
          user_id: user.id,
          type: "credits",
          package_id: packageId,
          credits: creditPackage.credits.toString(),
        },
      };
    } else {
      throw new Error("Invalid checkout type");
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ sessionId: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
