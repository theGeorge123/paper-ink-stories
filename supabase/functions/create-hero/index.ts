import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_HEROES_PER_WEEK = 7;
const DAYS_WINDOW = 7;

// Input validation schema
const createHeroSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
  archetype: z.string().min(1, "Archetype is required").max(50, "Archetype must be less than 50 characters"),
  age_band: z.enum(["1-2", "3-5", "6-8"]).optional().default("6-8"),
  traits: z.array(z.string().max(50)).min(1, "At least one trait is required").max(5, "Maximum 5 traits allowed"),
  icon: z.string().max(50).optional(),
  sidekick_name: z.string().max(100).optional().nullable(),
  sidekick_archetype: z.string().max(50).optional().nullable(),
  preferred_language: z.string().max(10).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    const rawInput = await req.json();
    const parseResult = createHeroSchema.safeParse(rawInput);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: parseResult.error.errors.map(e => e.message).join(", ")
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, archetype, age_band, traits, icon, sidekick_name, sidekick_archetype, preferred_language } = parseResult.data;

    // Use service role client for rate limit check
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check creation limit: count creations in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - DAYS_WINDOW);

    const { count, error: countError } = await adminClient
      .from("hero_creation_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", sevenDaysAgo.toISOString());

    if (countError) {
      console.error("Failed to check creation limit:", countError);
      return new Response(JSON.stringify({ error: "Failed to check creation limit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentCount = count || 0;
    console.log(`User ${user.id} has created ${currentCount} heroes in the last ${DAYS_WINDOW} days`);

    if (currentCount >= MAX_HEROES_PER_WEEK) {
      return new Response(JSON.stringify({ 
        error: "limit_reached",
        message: `Je kunt maximaal ${MAX_HEROES_PER_WEEK} heroes per week maken. Probeer het later opnieuw.`,
        current_count: currentCount,
        max_allowed: MAX_HEROES_PER_WEEK,
        resets_in_days: DAYS_WINDOW
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle();

    const preferredLanguage = preferred_language || profile?.language || "en";

    // Create the character
    const { data: character, error: createError } = await supabase
      .from("characters")
      .insert({
        user_id: user.id,
        name,
        archetype,
        age_band: age_band || "6-8",
        traits,
        icon: icon || archetype,
        sidekick_name: sidekick_name || null,
        sidekick_archetype: sidekick_archetype || null,
        preferred_language: preferredLanguage,
      })
      .select()
      .single();

    if (createError) {
      console.error("Failed to create character:", createError);
      return new Response(JSON.stringify({ error: "Failed to create character", details: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the creation for rate limiting
    const { error: logError } = await adminClient
      .from("hero_creation_log")
      .insert({
        user_id: user.id,
      });

    if (logError) {
      console.error("Failed to log hero creation:", logError);
      // Don't fail the request, just log
    }

    console.log(`Character ${character.id} created successfully for user ${user.id}`);

    // Trigger portrait generation in background (fire and forget)
    generatePortrait(character, user.id).catch(err => {
      console.error("Background portrait generation failed:", err);
    });

    return new Response(JSON.stringify({ 
      success: true,
      character,
      remaining_creations: MAX_HEROES_PER_WEEK - currentCount - 1
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Create hero error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

type CharacterIdentifier = { id: string };

async function generatePortrait(character: CharacterIdentifier, userId: string) {
  try {
    console.log(`Starting portrait generation for character ${character.id}`);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Call the generate-hero-portrait function
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-hero-portrait`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ characterId: character.id }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Portrait generation failed for ${character.id}:`, error);
    } else {
      console.log(`Portrait generation triggered for ${character.id}`);
    }
  } catch (error) {
    console.error(`Error triggering portrait generation for ${character.id}:`, error);
  }
}
