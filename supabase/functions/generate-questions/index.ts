import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const heroProfileSchema = z.object({
  heroName: z.string().min(1),
  heroType: z.string().min(1),
  ageBand: z.string().optional().default("3-5"),
  traits: z.array(z.string()).optional().default([]),
  comfortItem: z.string().optional().default("blanket"),
  sidekickName: z.string().nullable().optional(),
  lastSummary: z.string().optional(),
  topTags: z.array(z.string()).optional().default([]),
  language: z.string().optional().default("en"),
});

const SYSTEM_PROMPT = `You are a creative bedtime story question designer for children. Generate personalized, engaging questions that help shape a bedtime story.

RULES:
- Questions must be age-appropriate and calming (bedtime context)
- Each option should have 2-3 relevant story tags
- Make questions specific to the hero's archetype and traits
- Options should be imaginative but soothing
- No scary, violent, or overly exciting themes
- Include the hero's name in questions naturally

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "level1": {
    "question": "Where should [heroName] begin tonight's peaceful adventure?",
    "options": [
      { "id": "level1-option1", "label": "A moonlit forest clearing", "tags": ["forest", "moonlight", "nature"] },
      { "id": "level1-option2", "label": "A cozy cloud kingdom", "tags": ["sky", "clouds", "dreamy"] },
      { "id": "level1-option3", "label": "A gentle seaside cave", "tags": ["ocean", "cave", "peaceful"] }
    ]
  },
  "level2": {
    "question": "What gentle challenge should [heroName] face?",
    "options": [
      { "id": "level2-option1", "label": "...", "tags": [...] },
      { "id": "level2-option2", "label": "...", "tags": [...] },
      { "id": "level2-option3", "label": "...", "tags": [...] }
    ]
  },
  "level3": {
    "question": "Who should comfort [heroName] at the story's end?",
    "options": [
      { "id": "level3-option1", "label": "...", "tags": [...] },
      { "id": "level3-option2", "label": "...", "tags": [...] },
      { "id": "level3-option3", "label": "...", "tags": [...] }
    ]
  }
}`;

const buildUserPrompt = (profile: z.infer<typeof heroProfileSchema>) => {
  const ageBandDescriptions: Record<string, string> = {
    "1-2": "1-2 year old toddler (very simple, soothing, repetitive)",
    "3-5": "3-5 year old preschooler (gentle adventure, simple choices)",
    "6-8": "6-8 year old child (light challenges, friendship themes)",
    "9-12": "9-12 year old tween (more complex scenarios, emotional depth)",
  };

  const ageDesc = ageBandDescriptions[profile.ageBand] || ageBandDescriptions["3-5"];
  const traits = profile.traits.length > 0 ? profile.traits.join(", ") : "kind and curious";
  
  let prompt = `Generate 3 levels of personalized bedtime story questions for:

HERO PROFILE:
- Name: ${profile.heroName}
- Type: ${profile.heroType}
- Age group: ${ageDesc}
- Character traits: ${traits}
- Comfort item: ${profile.comfortItem}`;

  if (profile.sidekickName) {
    prompt += `\n- Sidekick: ${profile.sidekickName}`;
  }

  if (profile.lastSummary && profile.lastSummary !== "None (first episode).") {
    prompt += `\n\nPREVIOUS STORY CONTEXT:\n${profile.lastSummary}`;
  }

  if (profile.topTags.length > 0) {
    prompt += `\n\nFAVORITE THEMES (include some):\n${profile.topTags.join(", ")}`;
  }

  prompt += `

REQUIREMENTS:
- Level 1: Ask about the main setting/adventure location (3 options)
- Level 2: Ask about a gentle challenge or activity appropriate for a ${profile.heroType} (3 options)
- Level 3: Ask about companionship or emotional comfort for the story's ending (3 options)
- Make all options calming and suitable for bedtime
- Tailor options to match a ${profile.heroType} character
- Each option needs exactly 2-3 story tags
- Use ${profile.language === "nl" ? "Dutch" : profile.language === "sv" ? "Swedish" : "English"} for questions and labels`;

  return prompt;
};

const parseJsonResponse = (content: string) => {
  const jsonMatch = content.match(/```json?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[1] || jsonMatch[0];
  }
  return content;
};

const validateQuestionsFormat = (data: unknown): boolean => {
  if (!data || typeof data !== "object") return false;
  const questions = data as Record<string, unknown>;
  
  for (const level of ["level1", "level2", "level3"]) {
    const lvl = questions[level] as Record<string, unknown>;
    if (!lvl || typeof lvl.question !== "string") return false;
    if (!Array.isArray(lvl.options) || lvl.options.length !== 3) return false;
    
    for (const opt of lvl.options) {
      const option = opt as Record<string, unknown>;
      if (typeof option.id !== "string" || typeof option.label !== "string") return false;
      if (!Array.isArray(option.tags) || option.tags.length === 0) return false;
    }
  }
  
  return true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[generate-questions] Starting request");

  try {
    const rawInput = await req.json();
    console.log("[generate-questions] Raw input:", JSON.stringify(rawInput));
    
    const parseResult = heroProfileSchema.safeParse(rawInput);

    if (!parseResult.success) {
      console.error("[generate-questions] Validation failed:", parseResult.error.errors);
      return errorResponse(
        "Invalid input",
        400,
        parseResult.error.errors.map((err) => err.message).join(", "),
      );
    }

    const profile = parseResult.data;
    console.log("[generate-questions] Validated profile for:", profile.heroName);

    const openRouterKey = Deno.env.get("openrouter") ?? Deno.env.get("OPENROUTER_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!openRouterKey) {
      console.error("[generate-questions] Missing OpenRouter API key");
      return errorResponse("Missing API configuration", 500);
    }

    const userPrompt = buildUserPrompt(profile);
    console.log("[generate-questions] User prompt length:", userPrompt.length);

    const openRouterModel = Deno.env.get("OPENROUTER_QUESTIONS_MODEL")?.trim() || "google/gemini-2.0-flash-001";
    console.log("[generate-questions] Using model:", openRouterModel);

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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-questions] OpenRouter API error:", aiResponse.status, errorText);
      return errorResponse("AI generation failed", 500, errorText);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    console.log("[generate-questions] Raw AI response length:", content.length);
    
    content = parseJsonResponse(content);

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(content.trim());
    } catch (error) {
      console.error("[generate-questions] Failed to parse AI response:", content);
      return errorResponse("Failed to parse AI response", 500);
    }

    if (!validateQuestionsFormat(parsedContent)) {
      console.error("[generate-questions] Invalid questions format:", parsedContent);
      return errorResponse("Invalid questions format from AI", 500);
    }

    console.log("[generate-questions] Successfully generated questions for:", profile.heroName);
    return jsonResponse(parsedContent as Record<string, unknown>);

  } catch (error) {
    console.error("[generate-questions] Edge function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
