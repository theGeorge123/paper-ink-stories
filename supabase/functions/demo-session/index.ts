import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 500, details?: string) =>
  jsonResponse({ error: { message, details } }, status);

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
      return errorResponse(
        "Invalid input",
        400,
        parseResult.error.errors.map((err) => err.message).join(", "),
      );
    }

    const { demoId } = parseResult.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Missing configuration", 500);
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

    return jsonResponse({
      profile,
      hero,
      last_episode: lastEpisode,
      top_tags: (preferences ?? []).map((item) => item.tag),
    });
  } catch (error) {
    console.error("Demo session error:", error);
    return errorResponse(
      "Unexpected error",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});
