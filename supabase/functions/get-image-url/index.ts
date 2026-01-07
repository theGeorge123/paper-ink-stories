import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
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

// Input validation schemas
const uuidSchema = z.string().uuid();
const getImageUrlSchema = z.object({
  heroId: uuidSchema.optional(),
  heroIds: z.array(uuidSchema).max(50, "Maximum 50 hero IDs allowed").optional(),
  storyId: uuidSchema.optional(),
  pageNumber: z.number().int().min(1).max(20).optional(),
}).refine(
  (data) => data.heroId || data.heroIds || (data.storyId && data.pageNumber),
  { message: "Must provide heroId, heroIds, or storyId with pageNumber" }
);

async function signUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60 * 6
) {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, { download: false });

  if (error || !data?.signedUrl) {
    console.error("Failed to sign url", bucket, path, error);
    return null;
  }

  return data.signedUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("Unauthorized", 401);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return errorResponse("Unauthorized", 401);
  }

  // Parse and validate input
  const rawInput = await req.json();
  const parseResult = getImageUrlSchema.safeParse(rawInput);
  
  if (!parseResult.success) {
    console.error("Validation error:", parseResult.error.errors);
    return errorResponse(
      "Invalid input",
      400,
      parseResult.error.errors.map((e) => e.message).join(", "),
    );
  }

  const { heroId, heroIds, storyId, pageNumber } = parseResult.data;

  try {
    // BATCH MODE: Sign multiple hero portrait URLs at once
    if (heroIds && Array.isArray(heroIds) && heroIds.length > 0) {
      // Verify ownership of all characters in one query
      const { data: characters, error: charsError } = await supabase
        .from("characters")
        .select("id, user_id")
        .in("id", heroIds);

      if (charsError) {
        console.error("Batch character fetch error:", charsError);
        return errorResponse("Failed to fetch characters", 500);
      }

      // Filter to only characters owned by this user
      const ownedCharacterIds = new Set(
        characters?.filter(c => c.user_id === user.id).map(c => c.id) || []
      );

      // Sign URLs for owned characters in parallel
      const results: Record<string, { signedUrl: string | null; storagePath: string }> = {};
      await Promise.all(
        heroIds.map(async (hId: string) => {
          if (ownedCharacterIds.has(hId)) {
            const storagePath = `${user.id}/${hId}.png`;
            const signedUrl = await signUrl(admin, "hero-portraits", storagePath);
            results[hId] = { signedUrl, storagePath };
          }
        })
      );

      return jsonResponse({ urls: results });
    }

    // SINGLE MODE: Original behavior for single heroId
    if (heroId) {
      const { data: character, error: characterError } = await supabase
        .from("characters")
        .select("user_id")
        .eq("id", heroId)
        .single();

      if (characterError || !character || character.user_id !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const storagePath = `${user.id}/${heroId}.png`;
      const signedUrl = await signUrl(admin, "hero-portraits", storagePath);
      return jsonResponse({ signedUrl, storagePath });
    }

    if (storyId && pageNumber) {
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .select("character_id")
        .eq("id", storyId)
        .single();

      if (storyError || !story) {
        return errorResponse("Story not found", 404);
      }

      const { data: character } = await supabase
        .from("characters")
        .select("user_id")
        .eq("id", story.character_id)
        .single();

      if (!character || character.user_id !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const storagePath = `${user.id}/${storyId}/page-${pageNumber}.png`;
      const signedUrl = await signUrl(admin, "story-images", storagePath);
      return jsonResponse({ signedUrl, storagePath });
    }

    return errorResponse("Invalid request", 400);
  } catch (error) {
    console.error("get-image-url error", error);
    return errorResponse(
      "Failed to resolve image",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});
