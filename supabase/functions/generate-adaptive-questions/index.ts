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

const inputSchema = z.object({
  character_id: z.string().uuid(),
  last_story_themes: z.array(z.string()).optional(),
  preferred_themes: z.array(z.string()).optional(),
  avoided_themes: z.array(z.string()).optional(),
  stories_count: z.number().int().min(0).optional().default(0),
  age_band: z.string().optional().default("3-5"),
  last_story_date: z.string().optional(),
});

const SYSTEM_PROMPT = `You are a personalized bedtime story assistant. Generate 3-4 pre-story questions that will help create the perfect bedtime story for this child.

QUESTION GENERATION RULES:

1. ALWAYS include "Story Length" as Question 1:
   - Options: "Short (3-5 min)", "Medium (5-8 min)", "Long (10-15 min)"
   - Use icons: 🌙 for Short, ✨ for Medium, 🌟 for Long
   - Mark "Medium" as recommended for most children

2. Generate 2-3 additional questions that are:
   - Personalized to this hero's journey and archetype
   - Age-appropriate for the specified age band
   - Based on past story patterns and preferences
   - Varied from previous question sets

3. ADAPTIVE QUESTION EXAMPLES:

   For NEW heroes (stories_count < 3):
   - "What world should {hero_name} explore first?"
   - "Who should {hero_name} meet on their first adventure?"
   - "What's {hero_name}'s special power?"

   For ESTABLISHED heroes (stories_count >= 3):
   - "Should {hero_name} revisit the [past location] or explore somewhere new?"
   - "Your last adventure was about {last_theme}. Tonight, should it be similar or different?"
   - "Which friend from past adventures should return tonight?"

   For RETURNING heroes (days_since > 7):
   - "It's been a while! What has {hero_name} been up to?"
   - "Pick up where we left off, or start fresh?"

4. ARCHETYPE-SPECIFIC QUESTIONS:

   Dragon heroes:
   - "Should {hero_name} fly high above the clouds or explore hidden caves?"
   - "What color flames should {hero_name}'s breath glow tonight?"

   Knight heroes:
   - "What noble quest calls {hero_name} tonight?"
   - "Which piece of magical armor should {hero_name} discover?"

   Cat heroes:
   - "Should {hero_name} prowl through moonlit gardens or cozy cottages?"
   - "What curious thing should {hero_name} investigate?"

   Astronaut heroes:
   - "Which planet should {hero_name} visit tonight?"
   - "What alien friend should {hero_name} meet?"

5. AGE-APPROPRIATE PHRASING:

   Ages 1-2:
   - Very simple, 3-5 word options
   - Use emojis heavily 🌙🌟⭐
   - Example: "Big or small?" "Fast or slow?"

   Ages 3-5:
   - Simple sentences, concrete choices
   - Example: "Should Max play in the forest or the castle?"

   Ages 6-8:
   - More detail, introduce gentle decision-making
   - Example: "Should Max help the lost baby dragon find its way home, or discover the secret treehouse?"

   Ages 9-12:
   - Complex choices with consequences
   - Example: "Should Max use the ancient map to find the lost city, or trust the mysterious guide who appeared in the dreams?"

6. LEARNING FROM PAST CHOICES:

   If preferred_themes includes "friendship":
   - Ask: "Should {hero_name} make a new friend or have an adventure with {sidekick_name}?"

   If avoided_themes includes "darkness":
   - Avoid: Questions about caves, night-time scary settings
   - Instead: Focus on magical gardens, sunny meadows, star-lit (not dark) nights

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "questions": [
    {
      "question_text": "How long should tonight's story be?",
      "question_type": "story_length",
      "options": [
        {
          "label": "Short",
          "description": "A few pages • Perfect for sleepy eyes",
          "icon": "🌙",
          "value": "short",
          "estimated_time": "3-5 min"
        },
        {
          "label": "Medium",
          "description": "A full adventure • Just right!",
          "icon": "✨",
          "value": "medium",
          "estimated_time": "5-8 min",
          "recommended": true
        },
        {
          "label": "Long",
          "description": "An epic tale to get lost in",
          "icon": "🌟",
          "value": "long",
          "estimated_time": "10-15 min"
        }
      ]
    },
    {
      "question_text": "Should {hero_name} return to the magical forest or explore the crystal caves?",
      "question_type": "setting",
      "options": [
        {
          "label": "Magical Forest",
          "description": "Where the friendly owl lives",
          "icon": "🌲",
          "value": "forest"
        },
        {
          "label": "Crystal Caves",
          "description": "A brand new place to discover",
          "icon": "💎",
          "value": "caves"
        }
      ]
    }
  ]
}`;

function calculateDaysSince(dateString: string | undefined): number {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const functionStartTime = Date.now();

  try {
    const rawInput = await req.json();
    const parseResult = inputSchema.safeParse(rawInput);

    if (!parseResult.success) {
      console.error("[generate-adaptive-questions] Validation failed:", parseResult.error.errors);
      return errorResponse("Invalid input", 400, parseResult.error.errors.map((e) => e.message).join(", "));
    }

    const input = parseResult.data;

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceRoleKey || !supabaseUrl) {
      console.error("[generate-adaptive-questions] Missing Supabase configuration");
      return errorResponse("Server configuration error", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch character details
    const { data: character, error: charError } = await supabase
      .from("characters")
      .select("name, archetype, traits, sidekick_name, sidekick_archetype, preferred_themes, avoided_themes, story_count, last_summary")
      .eq("id", input.character_id)
      .single();

    if (charError || !character) {
      console.error("[generate-adaptive-questions] Character not found:", charError);
      return errorResponse("Character not found", 404);
    }

    // Get last story date if not provided
    const { data: lastStory } = await supabase
      .from("stories")
      .select("created_at, themes")
      .eq("character_id", input.character_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const daysSince = calculateDaysSince(input.last_story_date || lastStory?.created_at);
    const lastThemes = input.last_story_themes || (lastStory?.themes as string[]) || [];
    const preferredThemes = input.preferred_themes || (character.preferred_themes as string[]) || [];
    const avoidedThemes = input.avoided_themes || (character.avoided_themes as string[]) || [];
    const storiesCount = input.stories_count || character.story_count || 0;
    const ageBand = input.age_band || "3-5";

    // Build user prompt
    const userPrompt = `Generate personalized pre-story questions for:

HERO CONTEXT:
- Name: ${character.name}
- Archetype: ${character.archetype}
- Age: ${ageBand}
- Personality: ${(character.traits as string[])?.join(", ") || "Curious, Adventurous"}
- Sidekick: ${character.sidekick_name || "None"}
- Stories completed: ${storiesCount}
- Last story themes: ${lastThemes.join(", ") || "None"}
- Preferred themes: ${preferredThemes.join(", ") || "None"}
- Avoided themes: ${avoidedThemes.join(", ") || "None"}
- Days since last story: ${daysSince}
- Last summary: ${character.last_summary || "None (first story)"}

${storiesCount < 3 ? "This is a NEW hero - focus on first adventures and exploration." : ""}
${storiesCount >= 3 ? "This is an ESTABLISHED hero - reference past adventures and offer continuity." : ""}
${daysSince > 7 ? "This is a RETURNING hero after a break - acknowledge the time gap." : ""}

Generate 3-4 questions total (including the required story_length question as Question 1).
Make questions feel natural and personalized to ${character.name}'s journey.`;

    // Call OpenRouter API
    const openRouterKey = Deno.env.get("openrouter") ?? "";
    if (!openRouterKey) {
      console.error("[generate-adaptive-questions] Missing OpenRouter API key");
      return errorResponse("API configuration error", 500);
    }

    const openRouterModel = Deno.env.get("OPENROUTER_QUESTIONS_MODEL")?.trim() || "google/gemini-2.0-flash-001";

    const aiStartTime = Date.now();
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl || "https://lovable.dev",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT.replace(/{hero_name}/g, character.name) },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-adaptive-questions] OpenRouter API error:", aiResponse.status, errorText);
      return errorResponse("AI generation failed", 500, errorText);
    }

    const aiLatency = Date.now() - aiStartTime;
    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/```json?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[1] || jsonMatch[0];
    }

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content.trim());
    } catch (error) {
      console.error("[generate-adaptive-questions] Failed to parse AI response:", content);
      return errorResponse("Failed to parse AI response", 500);
    }

    // Validate structure
    const questions = parsedContent as { questions?: unknown[] };
    if (!questions.questions || !Array.isArray(questions.questions) || questions.questions.length < 2) {
      console.error("[generate-adaptive-questions] Invalid questions format");
      return errorResponse("Invalid questions format from AI", 500);
    }

    const totalTime = Date.now() - functionStartTime;
    console.log(`[PERF] Adaptive questions generated in ${totalTime}ms (AI: ${aiLatency}ms) for ${character.name}`);

    return jsonResponse(parsedContent as Record<string, unknown>);

  } catch (error) {
    console.error("[generate-adaptive-questions] Edge function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
