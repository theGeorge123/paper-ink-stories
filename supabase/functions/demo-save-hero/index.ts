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

const demoHeroSchema = z.object({
  demoId: z.string().uuid("Invalid demo ID format"),
  hero: z.object({
    heroName: z.string().min(1),
    heroType: z.string().min(1),
    heroTrait: z.string().min(1),
    comfortItem: z.string().min(1),
    ageBand: z.string().min(1),
    sidekickName: z.string().optional().nullable(),
    sidekickArchetype: z.string().optional().nullable(),
  }),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInput = await req.json();
    const parseResult = demoHeroSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return errorResponse(
        "Invalid input",
        400,
        parseResult.error.errors.map((err) => err.message).join(", "),
      );
    }

    const { demoId, hero } = parseResult.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Missing configuration", 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    await adminClient
      .from("demo_profiles")
      .upsert({ id: demoId }, { onConflict: "id" });

    const { error: heroError } = await adminClient
      .from("demo_hero")
      .upsert({
        profile_id: demoId,
        hero_name: hero.heroName,
        hero_type: hero.heroType,
        hero_trait: hero.heroTrait,
        comfort_item: hero.comfortItem,
        age_band: hero.ageBand,
        sidekick_name: hero.sidekickName || null,
        sidekick_archetype: hero.sidekickArchetype || null,
      }, { onConflict: "profile_id" });

    if (heroError) {
      return errorResponse("Failed to save hero", 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Demo save hero error:", error);
    return errorResponse(
      "Unexpected error",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});
