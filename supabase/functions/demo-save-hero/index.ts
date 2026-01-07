import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({
        error: "Invalid input",
        details: parseResult.error.errors.map((err) => err.message).join(", "),
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { demoId, hero } = parseResult.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Failed to save hero" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Demo save hero error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
