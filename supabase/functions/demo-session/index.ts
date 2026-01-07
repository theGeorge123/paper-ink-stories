import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const demoSessionSchema = z.object({
  demoId: z.string().uuid("Invalid demo ID format"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInput = await req.json();
    const parseResult = demoSessionSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return new Response(JSON.stringify({
        error: "Invalid input",
        details: parseResult.error.errors.map((err) => err.message).join(", "),
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { demoId } = parseResult.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await adminClient
      .from("demo_profiles")
      .upsert({ id: demoId }, { onConflict: "id" })
      .select("id, stories_used")
      .single();

    const { data: hero } = await adminClient
      .from("demo_hero")
      .select("*")
      .eq("profile_id", demoId)
      .maybeSingle();

    const { data: lastEpisode } = await adminClient
      .from("demo_episodes")
      .select("*")
      .eq("profile_id", demoId)
      .order("episode_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: preferences } = await adminClient
      .from("demo_preferences")
      .select("tag, score")
      .eq("profile_id", demoId)
      .order("score", { ascending: false })
      .limit(5);

    return new Response(JSON.stringify({
      profile,
      hero,
      last_episode: lastEpisode,
      top_tags: (preferences ?? []).map((item) => item.tag),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Demo session error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
