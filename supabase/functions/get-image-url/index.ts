import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function signUrl(
  client: any,
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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { heroId, storyId, pageNumber } = await req.json();

  try {
    if (heroId) {
      const { data: character, error: characterError } = await supabase
        .from("characters")
        .select("user_id")
        .eq("id", heroId)
        .single();

      if (characterError || !character || character.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const storagePath = `${user.id}/${heroId}.png`;
      const signedUrl = await signUrl(admin, "hero-portraits", storagePath);
      return new Response(JSON.stringify({ signedUrl, storagePath }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (storyId && pageNumber) {
      const { data: story, error: storyError } = await supabase
        .from("stories")
        .select("character_id")
        .eq("id", storyId)
        .single();

      if (storyError || !story) {
        return new Response(JSON.stringify({ error: "Story not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: character } = await supabase
        .from("characters")
        .select("user_id")
        .eq("id", story.character_id)
        .single();

      if (!character || character.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const storagePath = `${user.id}/${storyId}/page-${pageNumber}.png`;
      const signedUrl = await signUrl(admin, "story-images", storagePath);
      return new Response(JSON.stringify({ signedUrl, storagePath }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("get-image-url error", error);
    return new Response(JSON.stringify({ error: "Failed to resolve image" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
