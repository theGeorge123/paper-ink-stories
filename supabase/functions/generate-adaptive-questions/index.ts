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

const SYSTEM_PROMPT = `You are a personalized bedtime story assistant. Generate exactly 3 pre-story questions with 3 options each that will help create the perfect bedtime story for this child.

CRITICAL RULES:
- Generate EXACTLY 3 questions
- Each question MUST have EXACTLY 3 options
- Questions must be based on the hero's PREVIOUS ADVENTURES (use last_summary)

QUESTION STRUCTURE:

**Question 1: Story Length** (ALWAYS FIRST)
- Options: "Short (3-5 min)", "Medium (5-8 min)", "Long (10-15 min)"
- Use icons: 🌙 for Short, ✨ for Medium, 🌟 for Long
- Mark "Medium" as recommended

**Question 2: Based on Previous Story** (CRITICAL - USE last_summary!)
- If last_summary exists: Create a question that references what happened
  - "Last time, {hero_name} visited [location from summary]. Tonight should we..."
  - "After [event from summary], {hero_name} could..."
  - "Remember when {hero_name} [action from summary]? Tonight..."
- If no last_summary (first story): Ask about setting/world
  - "Where should {hero_name}'s first adventure begin?"

**Question 3: Adventure Focus**
- What the adventure should be about tonight
- Based on archetype and age band
- Avoid themes in avoided_themes
- Include themes from preferred_themes

AGE-APPROPRIATE LANGUAGE:
- Ages 1-2: 3-5 word options with emojis
- Ages 3-5: Simple sentences, concrete choices
- Ages 6-8: More detail, gentle choices
- Ages 9-12: Complex choices with meaning

OUTPUT FORMAT (STRICT JSON - NO MARKDOWN):
{
  "questions": [
    {
      "question_text": "How long should tonight's story be?",
      "question_type": "story_length",
      "options": [
        {"label": "Short", "description": "Perfect for sleepy eyes", "icon": "🌙", "value": "short", "estimated_time": "3-5 min"},
        {"label": "Medium", "description": "A full adventure", "icon": "✨", "value": "medium", "estimated_time": "5-8 min", "recommended": true},
        {"label": "Long", "description": "An epic tale", "icon": "🌟", "value": "long", "estimated_time": "10-15 min"}
      ]
    },
    {
      "question_text": "Based on last adventure - where next?",
      "question_type": "setting",
      "options": [
        {"label": "Option A", "description": "Description", "icon": "🌲", "value": "option_a"},
        {"label": "Option B", "description": "Description", "icon": "🏰", "value": "option_b"},
        {"label": "Option C", "description": "Description", "icon": "🌊", "value": "option_c"}
      ]
    },
    {
      "question_text": "What should the adventure be about?",
      "question_type": "theme",
      "options": [
        {"label": "Theme A", "description": "Description", "icon": "🎭", "value": "theme_a"},
        {"label": "Theme B", "description": "Description", "icon": "🔮", "value": "theme_b"},
        {"label": "Theme C", "description": "Description", "icon": "💫", "value": "theme_c"}
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

    // Build user prompt with strong emphasis on previous story continuity
    const lastSummary = character.last_summary || null;
    
    const userPrompt = `Generate EXACTLY 3 pre-story questions with 3 options each for:

HERO PROFILE:
- Name: ${character.name}
- Archetype: ${character.archetype}
- Age Band: ${ageBand} years old
- Personality: ${(character.traits as string[])?.join(", ") || "Curious, Adventurous"}
- Sidekick: ${character.sidekick_name || "None"}

STORY HISTORY (CRITICAL - USE THIS!):
- Total adventures completed: ${storiesCount}
- Last story themes: ${lastThemes.join(", ") || "None yet"}
- Preferred themes: ${preferredThemes.join(", ") || "None yet"}
- Avoided themes: ${avoidedThemes.join(", ") || "None"}
- Days since last story: ${daysSince}

## PREVIOUS ADVENTURE SUMMARY (USE THIS FOR QUESTION 2!)
${lastSummary ? `"${lastSummary}"

IMPORTANT: Question 2 MUST reference this summary! Examples:
- "After ${character.name}'s adventure in [location from summary], should we..."
- "Last time ${character.name} [did something from summary]. Tonight..."
- "Remember when ${character.name} met [character from summary]? Should they..."` : `This is ${character.name}'s FIRST adventure! No previous story exists.
Question 2 should ask where the first adventure should begin.`}

${storiesCount >= 3 ? `This is an ESTABLISHED hero with ${storiesCount} stories - make questions build on their history.` : ""}
${daysSince > 7 ? `It's been ${daysSince} days since the last story - acknowledge the time gap warmly.` : ""}

Generate EXACTLY 3 questions. Each question MUST have EXACTLY 3 options.`;

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

    // Validate structure - must have exactly 3 questions with 3 options each
    const questions = parsedContent as { questions?: unknown[] };
    if (!questions.questions || !Array.isArray(questions.questions)) {
      console.error("[generate-adaptive-questions] Invalid questions format - missing questions array");
      return errorResponse("Invalid questions format from AI", 500);
    }
    
    if (questions.questions.length !== 3) {
      console.error("[generate-adaptive-questions] Wrong number of questions:", questions.questions.length);
      // Try to fix by padding or trimming
      if (questions.questions.length > 3) {
        questions.questions = questions.questions.slice(0, 3);
      }
    }
    
    // Validate each question has exactly 3 options
    for (const q of questions.questions) {
      const question = q as { options?: unknown[] };
      if (!question.options || !Array.isArray(question.options)) {
        console.error("[generate-adaptive-questions] Question missing options");
        return errorResponse("Invalid question format from AI", 500);
      }
      if (question.options.length !== 3) {
        console.warn("[generate-adaptive-questions] Question has", question.options.length, "options instead of 3");
        // Pad or trim to 3 options
        if (question.options.length > 3) {
          question.options = question.options.slice(0, 3);
        }
      }
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
