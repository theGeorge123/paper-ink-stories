import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MANDATORY STYLE BLOCK - DO NOT MODIFY
const STORYBOOK_STYLE = "Storybook illustration, hand-painted watercolor and gouache style, soft paper texture, warm cozy bedtime lighting, gentle edges, child-friendly proportions, simple light background, no text, no logos, no watermark, not photorealistic, not 3D, not anime.";

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  knight: "a noble young knight in shining silver armor with a red cape",
  wizard: "a friendly young wizard in flowing purple robes with a pointed hat",
  cat: "an adorable fluffy cat with big curious eyes",
  robot: "a cute friendly robot with round features and glowing eyes",
  princess: "an elegant young princess in a flowing pastel gown with a small tiara",
  dragon: "a small friendly dragon with colorful scales and tiny wings",
  astronaut: "a brave young astronaut in a white spacesuit with a round helmet",
  pirate: "a cheerful young pirate with a bandana and friendly smile",
  fairy: "a delicate fairy with shimmering wings and a gentle glow",
  owl: "a wise owl with large round eyes and soft feathers",
  bunny: "an adorable fluffy bunny with long floppy ears",
  bear: "a cuddly teddy bear with warm brown fur and kind eyes",
};

const AGE_MODIFIERS: Record<string, string> = {
  "3-5": "very cute and simple, extra rounded features, bright cheerful colors",
  "6-8": "whimsical and magical, balanced proportions, vibrant warm colors",
  "9-12": "slightly more detailed, graceful features, rich atmospheric colors",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== GENERATE HERO PORTRAIT ===");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { characterId, regenerate } = await req.json();

    if (!characterId) {
      return new Response(JSON.stringify({ error: "Missing characterId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch character data
    const { data: character, error: fetchError } = await adminClient
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (fetchError || !character) {
      console.error("Failed to fetch character:", fetchError);
      return new Response(JSON.stringify({ error: "Character not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // IDEMPOTENT: Skip if image already exists (unless regenerate flag)
    if (character.hero_image_url && !regenerate) {
      console.log(`Character ${characterId} already has a portrait, skipping`);
      return new Response(JSON.stringify({ 
        success: true,
        already_exists: true,
        hero_image_url: character.hero_image_url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate OpenAI API key (stored as openrouterimage secret)
    const openaiKey = Deno.env.get("openrouterimage");
    if (!openaiKey) {
      console.error("CRITICAL: openrouterimage API key not configured");
      return new Response(JSON.stringify({ error: "Image generation not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the prompt
    const archetypeDesc = ARCHETYPE_DESCRIPTIONS[character.archetype] || `a ${character.archetype}`;
    const ageModifier = AGE_MODIFIERS[character.age_band || "6-8"] || AGE_MODIFIERS["6-8"];
    const traitsDesc = character.traits?.length > 0 ? `looking ${character.traits.join(" and ")}` : "";
    
    let sidekickDesc = "";
    if (character.sidekick_name && character.sidekick_archetype) {
      const sidekickArchetype = ARCHETYPE_DESCRIPTIONS[character.sidekick_archetype] || `a ${character.sidekick_archetype}`;
      sidekickDesc = `, accompanied by their companion ${sidekickArchetype} named ${character.sidekick_name}`;
    }

    const characterPrompt = `A portrait of ${character.name}, ${archetypeDesc}${sidekickDesc}. ${traitsDesc}. ${ageModifier}.`;
    const fullPrompt = `${characterPrompt} ${STORYBOOK_STYLE}`;

    console.log("Generated prompt:", fullPrompt);

    // Call OpenAI DALL-E API directly
    console.log("Calling OpenAI DALL-E image generation...");
    
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("OpenAI image error:", imageResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Image generation failed", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageData = await imageResponse.json();
    console.log("Image generation response received");

    // gpt-image-1 returns base64 data
    const base64Image = imageData.data?.[0]?.b64_json;
    if (!base64Image) {
      console.error("No image data in response:", JSON.stringify(imageData).slice(0, 500));
      return new Response(JSON.stringify({ error: "No image generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert base64 to binary
    console.log("Processing generated image...");
    const binaryString = atob(base64Image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBuffer = bytes.buffer;

    // Upload to Supabase Storage
    const storagePath = `${character.user_id}/${characterId}.png`;
    console.log("Uploading to storage:", storagePath);

    const { error: uploadError } = await adminClient.storage
      .from("hero-portraits")
      .upload(storagePath, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to save image", details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: { publicUrl } } = adminClient.storage
      .from("hero-portraits")
      .getPublicUrl(storagePath);

    console.log("Public URL:", publicUrl);

    // Update character with image data
    const { error: updateError } = await adminClient
      .from("characters")
      .update({
        hero_image_url: publicUrl,
        hero_image_prompt: fullPrompt,
        hero_image_style: "storybook_illustration_v1",
      })
      .eq("id", characterId);

    if (updateError) {
      console.error("Failed to update character:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save image reference" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Portrait generated successfully for character ${characterId}`);

    return new Response(JSON.stringify({ 
      success: true,
      hero_image_url: publicUrl,
      prompt_used: fullPrompt
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate portrait error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
