import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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

async function hashPrompt(prompt: string): Promise<string> {
  const buffer = new TextEncoder().encode(prompt.trim());
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createSignedUrl(
  client: SupabaseClient,
  bucket: string,
  path: string,
  expiresInSeconds = 60 * 60 * 24 * 7, // 7 days
) {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, { download: false });

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

const AGE_MODIFIERS: Record<string, string> = {
  "1-2": "ultra-simple, baby-safe softness, pastel colors, rounded baby features",
  "3-5": "very cute and simple, extra rounded features, bright cheerful colors",
  "6-8": "whimsical and magical, balanced proportions, vibrant warm colors",
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

    // Validate OpenRouter API key
    const openRouterKey = Deno.env.get("openrouterimage");
    if (!openRouterKey) {
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

    const anchor = character.visual_description_anchor?.trim();
    const anchorPrompt = anchor
      ? ` Maintain these exact visual anchors: ${anchor}. Keep facial features, colors, and accessories identical across renderings.`
      : "";

    const characterPrompt = `A portrait of ${character.name}, ${archetypeDesc}${sidekickDesc}. ${traitsDesc}. ${ageModifier}.`;
    const fullPrompt = `${characterPrompt}${anchorPrompt} ${STORYBOOK_STYLE}`;

    console.log("Generated prompt:", fullPrompt);

    const promptHash = await hashPrompt(fullPrompt);

    // IDEMPOTENT: reuse latest matching asset unless regenerate flag
    if (!regenerate) {
      const { data: existingAsset } = await adminClient
        .from("image_assets")
        .select("storage_bucket,storage_path")
        .eq("hero_id", characterId)
        .eq("type", "hero")
        .eq("prompt_hash", promptHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingAsset) {
        const signedUrl = await createSignedUrl(
          adminClient,
          existingAsset.storage_bucket,
          existingAsset.storage_path
        );

        if (signedUrl) {
          await adminClient
            .from("characters")
            .update({ hero_image_url: signedUrl })
            .eq("id", characterId);

          console.log(`Reused cached portrait for character ${characterId}`);
          return new Response(JSON.stringify({
            success: true,
            already_exists: true,
            hero_image_url: signedUrl,
            storage_path: existingAsset.storage_path,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Call OpenRouter with Sourceful Riverflow V2 Fast Preview model
    console.log("Calling OpenRouter Riverflow for image generation...");
    
    const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
      },
      body: JSON.stringify({
        model: "sourceful/riverflow-v2-fast-preview",
        messages: [
          {
            role: "user",
            content: fullPrompt
          }
        ],
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("OpenRouter Riverflow error:", imageResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Image generation failed", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageData = await imageResponse.json();
    console.log("Image generation response received");

    // Extract image URL from Riverflow response
    // Riverflow returns image URLs in the content
    const content = imageData.choices?.[0]?.message?.content;
    console.log("Response content type:", typeof content);
    
    let imageUrl: string | null = null;
    
    // Check if content is an array (multimodal response)
    if (Array.isArray(content)) {
      type ImageContent = { type?: string; image_url?: { url?: string }; url?: string };
      const imageItem = (content as ImageContent[]).find((item) => item.type === "image_url" || item.type === "image");
      if (imageItem?.image_url?.url) {
        imageUrl = imageItem.image_url.url;
      } else if (imageItem?.url) {
        imageUrl = imageItem.url;
      }
    } else if (typeof content === "string") {
      // Try to extract URL from string content
      const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/i);
      if (urlMatch) {
        imageUrl = urlMatch[0];
      }
    }
    
    // Also check for images array in message
    if (!imageUrl && imageData.choices?.[0]?.message?.images) {
      const images = imageData.choices[0].message.images;
      if (images[0]?.url) {
        imageUrl = images[0].url;
      } else if (images[0]?.image_url?.url) {
        imageUrl = images[0].image_url.url;
      }
    }

    if (!imageUrl) {
      console.error("No image URL in response:", JSON.stringify(imageData).slice(0, 1000));
      return new Response(JSON.stringify({ error: "No image generated", response: JSON.stringify(imageData).slice(0, 500) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Image URL received:", imageUrl.slice(0, 100) + "...");

    // Download the image
    console.log("Downloading generated image...");
    let imageBuffer: ArrayBuffer;
    
    if (imageUrl.startsWith("data:image")) {
      // Handle base64 data URL
      const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (!base64Match) {
        console.error("Invalid base64 image format");
        return new Response(JSON.stringify({ error: "Invalid image format" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const binaryString = atob(base64Match[1]);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBuffer = bytes.buffer;
    } else {
      // Download from URL
      const imageDownload = await fetch(imageUrl);
      if (!imageDownload.ok) {
        console.error("Failed to download image:", imageDownload.status);
        return new Response(JSON.stringify({ error: "Failed to download generated image" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const imageBlob = await imageDownload.blob();
      imageBuffer = await imageBlob.arrayBuffer();
    }

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

    await adminClient.from("image_assets").insert({
      user_id: character.user_id,
      hero_id: characterId,
      type: "hero",
      prompt_hash: promptHash,
      model: "sourceful/riverflow-v2-fast-preview",
      storage_bucket: "hero-portraits",
      storage_path: storagePath,
      is_public: false,
    });

    const signedUrl = await createSignedUrl(adminClient, "hero-portraits", storagePath);
    if (!signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to sign image URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update character with image data
    const { error: updateError } = await adminClient
      .from("characters")
      .update({
        hero_image_url: signedUrl,
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
      hero_image_url: signedUrl,
      prompt_used: fullPrompt,
      storage_path: storagePath,
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
