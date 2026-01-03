import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LENGTH_PAGES = {
  SHORT: 5,
  MEDIUM: 9,
  LONG: 12,
};

const startSchema = z.object({
  characterId: z.string().uuid(),
  length: z.enum(["SHORT", "MEDIUM", "LONG"]),
  storyRoute: z.enum(["A", "B", "C"]).default("A"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!authHeader || !token) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const userResult = await adminClient.auth.getUser(token);
    if (userResult.error || !userResult.data.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = startSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { characterId, length, storyRoute } = parsed.data;

    console.log("Starting story for character:", characterId, "length:", length, "route:", storyRoute);

    const { data: character, error: characterError } = await adminClient
      .from("characters")
      .select("id, user_id, age_band, name")
      .eq("id", characterId)
      .single();

    if (characterError || !character) {
      console.error("Character lookup failed:", characterError);
      return new Response(JSON.stringify({ error: "Character not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (character.user_id !== userResult.data.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enforcedLength = character.age_band === "1-2" ? "SHORT" : length;
    const totalPages = LENGTH_PAGES[enforcedLength];

    // Store route and total pages in story_state since those columns don't exist directly
    const storyState = { 
      location: "Home", 
      inventory: [],
      route: storyRoute,
      totalPages: totalPages,
      ageBand: character.age_band
    };

    const { data: story, error: insertError } = await adminClient
      .from("stories")
      .insert({
        character_id: characterId,
        length_setting: enforcedLength,
        is_active: true,
        story_state: storyState,
      })
      .select()
      .single();

    if (insertError || !story) {
      console.error("Failed to create story", insertError);
      return new Response(JSON.stringify({ error: "Failed to start story" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Story created:", story.id);

    // Kick off generation without blocking the response
    adminClient.functions
      .invoke("generate-page", { body: { storyId: story.id }, headers: { Authorization: authHeader } })
      .catch((error) => console.error("Background generation failed", error));

    return new Response(JSON.stringify({ storyId: story.id, status: "generating", totalPages }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unhandled start-story-generation error", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
