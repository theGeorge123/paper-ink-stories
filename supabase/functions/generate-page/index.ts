import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `
You are an expert children's author and sleep specialist.

## CONTEXT VARIABLES
- Language: {language}
- Age: {age_band}
- StoryPhase: {phase}

## 1. STORY STRUCTURE

**SETUP (Page 1):**
- If \`pending_choice\` exists, START the story with that choice happening. Example: "Leo opened the mysterious door..."
- If \`previous_summary\` exists, mention it naturally in the FIRST paragraph.
- If no plot_outline exists, generate 3-4 bullet points for the story arc.
- Create a gentle hook and establish a cozy setting.

**JOURNEY (Middle Pages):**
- Follow the plot_outline beats.
- Use "Deep Sensory Visualization" (describe textures, smells, soft sounds) to tire the mind.
- Each paragraph should feel like sinking deeper into a soft pillow.
- Use progressively shorter sentences.

**WIND-DOWN (Final Page):**
- Ultra-slow, rhythmic, lullaby-like pacing.
- Character naturally grows sleepy, finds a cozy spot.
- Wrap up warmly—character falls asleep feeling safe and loved.
- MUST set is_ending=true and provide adventure_summary.
- MUST provide exactly 3 next_options for tomorrow's adventure.

## 2. AGE-SPECIFIC RULES

**Ages 3-5:**
- 80-120 words per page
- Short sentences (5-10 words)
- Immediate sensory experiences
- Talking animals, friendly clouds
- Simple familiar words only

**Ages 6-8:**
- 150-220 words per page
- Compound sentences, light metaphors
- Small adventures, problem-solving
- Whimsical fantasy elements
- 1 "growth word" per page with context clues (e.g., "The tree was *immense*—so tall it touched the clouds...")

**Ages 9-12:**
- 250-350 words per page
- Complex sentences, internal thoughts
- Self-discovery, meaningful choices
- Deeper emotional resonance
- Rich, evocative language with sophisticated metaphors

## 3. SAFETY RULES (ABSOLUTE)
❌ NO monsters, villains, threats, or scary elements
❌ NO violence, conflict, or danger
❌ NO abandonment, loss, or separation triggers
✅ ALL conflicts are gentle (lost item found, friend helped)
✅ The world is ALWAYS safe and loving

## 4. OUTPUT FORMAT (STRICT JSON ONLY)
You must output ONLY this JSON structure. DO NOT wrap in markdown code blocks.

{
  "page_text": "The beautifully crafted story text in the specified language...",
  "is_ending": false,
  "adventure_summary": "One-sentence summary (ONLY when is_ending is true, else null)",
  "next_options": ["Option A", "Option B", "Option C"] (ONLY when is_ending is true, else null),
  "plot_outline": ["Beat 1", "Beat 2", "Beat 3"] (ONLY on page 1 if generating new outline),
  "new_location": "Location name if character traveled",
  "new_inventory": ["Items gained if any"]
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

    const { storyId } = await req.json();
    console.log("Generating page for story:", storyId);

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

    // Fetch user's language preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single();
    
    const language = profile?.language || "en";
    const languageNames: Record<string, string> = {
      en: "English",
      nl: "Dutch (Nederlands)",
      sv: "Swedish (Svenska)"
    };

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
    const ageBand = character.age_band || "6-8";
    const pendingChoice = character.pending_choice;
    
    const characterDNA = `
## CHARACTER PROFILE
- Name: ${character.name}
- Age Band: ${ageBand} years old (FOLLOW THE AGE-SPECIFIC RULES FOR THIS AGE GROUP)
- Archetype: ${character.archetype}
- Personality Traits: ${character.traits.join(", ")}
${character.sidekick_name ? `- Loyal Companion: ${character.sidekick_name} the ${character.sidekick_archetype}` : ""}
    `.trim();

    // Build story context with plot_outline support
    const storyState = story.story_state || { location: "Home", inventory: [], plot_outline: [] };
    const previousPagesText = pages.map((p: { page_number: number; content: string }) => 
      `Page ${p.page_number}: ${p.content}`
    ).join("\n\n");

    // Determine story phase for pacing
    const storyProgress = currentPage / targetPages;
    let storyPhase = "SETUP";
    if (storyProgress > 0.6) storyPhase = "WINDDOWN";
    else if (storyProgress > 0.2) storyPhase = "JOURNEY";

    // Build user prompt with all context (simplified - no mood/humor)
    let userPrompt = `
${characterDNA}

## LANGUAGE REQUIREMENT
Write the entire story in ${languageNames[language] || "English"}. All text including next_options must be in this language.

## CURRENT STORY STATE
- Location: ${storyState.location}
- Items Collected: ${storyState.inventory?.length ? storyState.inventory.join(", ") : "none yet"}
- Plot Outline: ${storyState.plot_outline?.length ? storyState.plot_outline.join(" → ") : "(Generate on page 1)"}
- Story Phase: ${storyPhase} (${Math.round(storyProgress * 100)}% through the story)
- Story Length: ${story.length_setting} (${targetPages} pages total)
- Current Page: ${currentPage} of ${targetPages}

## PREVIOUS PAGES
${previousPagesText || "(This is the very beginning of the story - generate plot_outline!)"}

## TONE
Keep the story calm and soothing, focusing on peaceful, gentle moments with sincere, heartfelt warmth.
    `.trim();

    // CLIFFHANGER INJECTION: If first page and has pending choice, start there
    if (currentPage === 1 && pendingChoice) {
      userPrompt += `

## CLIFFHANGER CONTINUATION (CRITICAL!)
The user previously chose: "${pendingChoice}"
You MUST start this story with ${character.name} doing exactly this action. The first paragraph must show this choice happening.`;
    }

    // MEMORY INJECTION: Reference previous adventure naturally
    if (currentPage === 1 && lastSummary) {
      userPrompt += `

## MEMORY REFERENCE
Previous adventure summary: "${lastSummary}"
Briefly reference this memory naturally in the first paragraph (e.g., "${character.name} smiled, remembering...")`;
    }

    // Add ending instructions if last page
    if (isLastPage) {
      userPrompt += `

## FINAL PAGE INSTRUCTIONS (CRITICAL!)
This is the FINAL page. You MUST:
1. Wrap up the plot warmly
2. Character must fall asleep feeling safe and loved
3. Set is_ending=true
4. Provide adventure_summary (one sentence recap)
5. Provide exactly 3 next_options in ${languageNames[language] || "English"} - exciting choices for TOMORROW's adventure (e.g., "Explore the crystal cave", "Visit the friendly dragon", "Find the hidden treasure")`;
    }

    // Build the system prompt with variables replaced
    const finalSystemPrompt = SYSTEM_PROMPT
      .replace("{language}", languageNames[language] || "English")
      .replace("{age_band}", ageBand)
      .replace("{phase}", storyPhase);

    console.log("Calling OpenRouter API for page", currentPage);

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
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
    console.log("AI response received for page", currentPage);

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

    // Update story state including plot_outline (always sync state for every page)
    const newState = {
      location: parsedContent.new_location || storyState.location,
      inventory: parsedContent.new_inventory || storyState.inventory,
      plot_outline: parsedContent.plot_outline || storyState.plot_outline || [],
    };

    const storyUpdate: Record<string, unknown> = {
      current_page: currentPage,
      story_state: newState,
    };

    // If ending, save summary, options, and mark inactive
    if (parsedContent.is_ending) {
      storyUpdate.last_summary = parsedContent.adventure_summary;
      storyUpdate.generated_options = parsedContent.next_options || [];
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

    console.log("Page generated successfully:", currentPage, "of", targetPages);

    return new Response(JSON.stringify({
      success: true,
      page_text: parsedContent.page_text,
      is_ending: parsedContent.is_ending || false,
      adventure_summary: parsedContent.adventure_summary || null,
      next_options: parsedContent.next_options || null,
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
