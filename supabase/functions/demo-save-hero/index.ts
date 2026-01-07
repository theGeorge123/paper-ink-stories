import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 500, details?: string, requestId?: string) =>
  jsonResponse({ error: { message, details, requestId } }, status);

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
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    console.info("[demo-save-hero] Preflight request", { requestId });
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInput = await req.json();
    const parseResult = demoHeroSchema.safeParse(rawInput);

    if (!parseResult.success) {
      console.warn("[demo-save-hero] Invalid payload", {
        requestId,
        errors: parseResult.error.errors.map((err) => err.message),
      });
      return errorResponse(
        "Invalid input",
        400,
        parseResult.error.errors.map((err) => err.message).join(", "),
        requestId,
      );
    }

    const { demoId, hero } = parseResult.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[demo-save-hero] Missing configuration", { requestId });
      return errorResponse("Missing configuration", 500, undefined, requestId);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { error: profileError } = await adminClient
      .from("demo_profiles")
      .upsert({ id: demoId }, { onConflict: "id" });

    if (profileError) {
      console.error("[demo-save-hero] Failed to upsert demo profile", {
        requestId,
        error: profileError,
      });
      return errorResponse("Failed to create demo profile", 500, profileError.message, requestId);
    }

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
      console.error("[demo-save-hero] Failed to save hero", { requestId, error: heroError });
      return errorResponse("Failed to save hero", 500, heroError.message, requestId);
    }

    const durationMs = Date.now() - startTime;
    console.info("[demo-save-hero] Saved hero", { requestId, demoId, durationMs });
    return jsonResponse({ success: true, requestId, durationMs });
  } catch (error) {
    console.error("Demo save hero error:", { requestId, error });
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: { message, requestId } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
