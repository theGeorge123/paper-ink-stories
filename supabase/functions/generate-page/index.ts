import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `
You are "The Dream Weaver" — an award-winning children's book author and pediatric sleep specialist with 30 years of experience crafting bedtime stories that help children drift peacefully to sleep.

## YOUR CORE MISSION
Create magical, personalized bedtime stories that:
1. Honor the child's unique character and personality
2. Guide them gently toward restful sleep
3. Build beautiful memories they'll treasure forever

## THE SLEEP ENGINEERING METHOD

### STORY PHASES
**Opening (Pages 1-2):** Gentle hook. Establish cozy setting. The character notices something wonderful.
**Rising Action (Middle Pages):** Dreamlike exploration. Sensory-rich descriptions (soft textures, warm colors, quiet sounds). Each paragraph should feel like sinking deeper into a soft pillow.
**Resolution (Final Pages):** Ultra-slow pacing. Rhythmic, lullaby-like sentences. Focus on warmth, safety, heaviness of eyelids, and the comfort of home/bed.

### PACING TECHNIQUES
- Use progressively shorter sentences as the story continues
- Include "breathing moments" — natural pauses in the narrative
- End paragraphs with calming imagery (stars twinkling, moon rising, soft blankets)

## AGE-SPECIFIC WRITING RULES

### AGES 3-5 (Early Reader)
- **Vocabulary:** Simple, familiar words. No complex abstractions.
- **Sentence Structure:** Subject-Verb-Object. Short sentences (5-10 words).
- **Word Count:** 80-120 words per page.
- **Themes:** Immediate sensory experiences, animal friends, cozy places.
- **Magic Level:** Gentle wonder (talking animals, friendly clouds).

### AGES 6-8 (Growing Reader)  
- **Vocabulary:** Introduce descriptive words. Light metaphors.
- **Sentence Structure:** Compound sentences. Some variety in length.
- **Word Count:** 150-220 words per page.
- **Themes:** Small adventures, problem-solving, friendship, discovery.
- **Magic Level:** Whimsical fantasy (flying on gentle breezes, visiting cloud kingdoms).

### AGES 9-12 (Independent Reader)
- **Vocabulary:** Rich, evocative language. Sophisticated descriptions.
- **Sentence Structure:** Complex sentences. Internal thoughts and feelings.
- **Word Count:** 250-350 words per page.
- **Themes:** Self-discovery, courage, meaningful choices, wonder.
- **Magic Level:** Deeper fantasy elements with emotional resonance.

## SAFETY RULES (ABSOLUTE)
- ❌ NO monsters, villains, threats, or scary elements
- ❌ NO violence, conflict, or danger (even mild)
- ❌ NO abandonment, loss, or separation anxiety triggers
- ❌ NO loud noises, sudden surprises, or startling events
- ✅ ALL conflicts are gentle (lost item found, friend helped, puzzle solved)
- ✅ The world is ALWAYS safe and loving

## PERSONALIZATION RULES
- Use the character's NAME naturally (not every sentence)
- Reflect their ARCHETYPE in their actions and decisions
- Incorporate their TRAITS into how they interact with the world
- If they have a SIDEKICK, include them as a loyal, supportive companion
- Reference PREVIOUS ADVENTURES subtly when provided

## OUTPUT FORMAT
You MUST output ONLY valid JSON:
{
  "page_text": "The beautifully crafted story text for this page...",
  "is_ending": false,
  "adventure_summary": "A magical one-sentence summary of the whole adventure (ONLY when is_ending is true, otherwise omit)",
  "new_location": "The new location name if the character traveled (optional)",
  "new_inventory": ["Any meaningful items the character gained (optional)"]
}
`;

const LENGTH_PAGES = { SHORT: 5, MEDIUM: 8, LONG: 12 };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storyId, mood, humor } = await req.json();
    console.log("Generating page for story:", storyId, "mood:", mood, "humor:", humor);

    // Fetch story with character
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*, characters(*)")
      .eq("id", storyId)
      .single();

    if (storyError || !story) {
      console.error("Story fetch error:", storyError);
      return new Response(JSON.stringify({ error: "Story not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership through character
    if (story.characters.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch existing pages
    const { data: pagesData } = await supabase
      .from("pages")
      .select("*")
      .eq("story_id", storyId)
      .order("page_number", { ascending: true });

    const pages = pagesData || [];
    const currentPage = pages.length + 1;
    const targetPages = LENGTH_PAGES[story.length_setting as keyof typeof LENGTH_PAGES] || 8;
    const isLastPage = currentPage >= targetPages;

    // Fetch last_summary from previous completed stories for memory
    const { data: previousStories } = await supabase
      .from("stories")
      .select("last_summary")
      .eq("character_id", story.character_id)
      .eq("is_active", false)
      .not("last_summary", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);

    const lastSummary = previousStories?.[0]?.last_summary;

    // Build character DNA
    const character = story.characters;
    const characterDNA = `
Character: ${character.name}
Archetype: ${character.archetype}
Traits: ${character.traits.join(", ")}
${character.sidekick_name ? `Sidekick: ${character.sidekick_name} (${character.sidekick_archetype})` : ""}
    `.trim();

    // Build story context
    const storyState = story.story_state || { location: "Home", inventory: [] };
    const previousPagesText = pages.map((p: { page_number: number; content: string }) => 
      `Page ${p.page_number}: ${p.content}`
    ).join("\n\n");

    // Build user prompt
    let userPrompt = `
${characterDNA}

Current Location: ${storyState.location}
Inventory: ${storyState.inventory?.join(", ") || "none"}

Story so far:
${previousPagesText || "(Beginning of story)"}

Director settings:
- Mood: ${mood === "exciting" ? "More adventurous and exciting" : "Calm and soothing"}
- Humor: ${humor === "funny" ? "Include gentle humor" : "Keep it sincere and heartfelt"}

Generate page ${currentPage} of ${targetPages}.
    `.trim();

    // Add memory reference if first page and has previous adventure
    if (currentPage === 1 && lastSummary) {
      userPrompt += `\n\nBriefly reference the previous adventure: "${lastSummary}"`;
    }

    // Add ending instructions if last page
    if (isLastPage) {
      userPrompt += `\n\nThis is the FINAL page. Wrap up the plot warmly. The character must fall asleep feeling safe and loved. Set is_ending=true and provide adventure_summary.`;
    }

    console.log("Calling OpenRouter API...");

    const OPENROUTER_API_KEY = Deno.env.get("openrouter");
    if (!OPENROUTER_API_KEY) {
      console.error("OpenRouter API key not configured");
      return new Response(JSON.stringify({ 
        error: "API configuration error",
        fallback: true,
        page_text: "The story magic is taking a short nap. Try again in a moment."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenRouter API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: "AI generation failed",
        fallback: true,
        page_text: "The story magic is taking a short nap. Try again in a moment."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```json?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[1] || jsonMatch[0];
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ 
        error: "Failed to parse AI response",
        fallback: true,
        page_text: "The story magic is taking a short nap. Try again in a moment."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert the new page
    const { error: pageError } = await supabase
      .from("pages")
      .insert({
        story_id: storyId,
        page_number: currentPage,
        content: parsedContent.page_text,
      });

    if (pageError) {
      console.error("Page insert error:", pageError);
      return new Response(JSON.stringify({ error: "Failed to save page" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update story state
    const newState = {
      location: parsedContent.new_location || storyState.location,
      inventory: parsedContent.new_inventory || storyState.inventory,
    };

    const storyUpdate: Record<string, unknown> = {
      current_page: currentPage,
      story_state: newState,
    };

    // If ending, save summary and mark inactive
    if (parsedContent.is_ending) {
      storyUpdate.last_summary = parsedContent.adventure_summary;
      storyUpdate.is_active = false;
      
      // Generate title if not set
      if (!story.title) {
        storyUpdate.title = `${character.name}'s Bedtime Adventure`;
      }
    }

    const { error: updateError } = await supabase
      .from("stories")
      .update(storyUpdate)
      .eq("id", storyId);

    if (updateError) {
      console.error("Story update error:", updateError);
    }

    console.log("Page generated successfully:", currentPage);

    return new Response(JSON.stringify({
      success: true,
      page_text: parsedContent.page_text,
      is_ending: parsedContent.is_ending || false,
      page_number: currentPage,
      total_pages: targetPages,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      fallback: true,
      page_text: "The story magic is taking a short nap. Try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
