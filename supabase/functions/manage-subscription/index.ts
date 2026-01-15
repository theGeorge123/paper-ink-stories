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
const subscriptionSchema = z.object({
  action: z.enum(["cancel", "reactivate", "portal"]),
});

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

    const parseResult = subscriptionSchema.safeParse(rawBody);
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid action", details: parseResult.error.errors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { action } = parseResult.data;

    // Get user's subscription
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      throw new Error("No active subscription found");
    }

    let result;

    switch (action) {
      case "cancel": {
        // Cancel subscription at period end
        const updated = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: true,
          }
        );

        // Update database
        await supabaseClient
          .from("subscriptions")
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        result = {
          success: true,
          message: "Subscription will be canceled at the end of the billing period",
          periodEnd: new Date(updated.current_period_end * 1000).toISOString(),
        };
        break;
      }

      case "reactivate": {
        // Reactivate subscription
        const updated = await stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          {
            cancel_at_period_end: false,
          }
        );

        // Update database
        await supabaseClient
          .from("subscriptions")
          .update({
            cancel_at_period_end: false,
            canceled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        result = {
          success: true,
          message: "Subscription reactivated successfully",
        };
        break;
      }

      case "portal": {
        // Create billing portal session
        const session = await stripe.billingPortal.sessions.create({
          customer: subscription.stripe_customer_id,
          return_url: `${req.headers.get("origin")}/dashboard`,
        });

        result = {
          success: true,
          url: session.url,
        };
        break;
      }

      default:
        throw new Error("Invalid action");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error managing subscription:", error);
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
