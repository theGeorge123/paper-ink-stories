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

const generateDemoSchema = z.object({
  storyBrief: z.string().min(1),
  heroName: z.string().min(1).optional(),
  language: z.string().max(10).optional(),
});

const SYSTEM_PROMPT = `
You are an expert children's author and sleep specialist applying the "Sleep Engineer" method.

SYSTEM SAFETY: Strictly child-friendly, cozy bedtime tone, no violence or scary themes.

Follow the provided story brief exactly. Return only JSON matching the required format.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "title": "...",
  "story": "The full bedtime story with paragraph breaks...",
  "summary": "A 2-3 sentence summary of the adventure.",
  "tags_used": ["theme1", "theme2", "theme3"],
  "reading_time_minutes": 4
}
`;

const parseJsonResponse = (content: string) => {
  const jsonMatch = content.match(/```json?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[1] || jsonMatch[0];
  }
  return content;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawInput = await req.json();
    const parseResult = generateDemoSchema.safeParse(rawInput);

    if (!parseResult.success) {
      return errorResponse(
        "Invalid input",
        400,
        parseResult.error.errors.map((err) => err.message).join(", "),
      );
    }

    const { storyBrief, heroName } = parseResult.data;
    const openRouterKey = Deno.env.get("openrouter") ?? Deno.env.get("OPENROUTER_API_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!openRouterKey || !supabaseUrl) {
      return errorResponse("Missing configuration", 500);
    }

    const userPrompt = `STORY BRIEF\n${storyBrief}`;
    const openRouterModel = Deno.env.get("OPENROUTER_STORY_PRESET")?.trim() || "@preset/story-teller";
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1800,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenRouter API error:", aiResponse.status, errorText);
      return errorResponse("AI generation failed", 500, errorText);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = parseJsonResponse(content);

    let parsedContent: {
      title?: string;
      story?: string;
      summary?: string;
      tags_used?: string[];
      reading_time_minutes?: number;
    };
    try {
      parsedContent = JSON.parse(content.trim());
    } catch (error) {
      console.error("Failed to parse AI response:", content);
      return errorResponse("Failed to parse AI response", 500);
    }

    if (!parsedContent.story || !parsedContent.summary) {
      return errorResponse("Invalid AI response", 500);
    }

    return jsonResponse({
      title: parsedContent.title || (heroName ? `${heroName}'s Bedtime Story` : "Your Bedtime Story"),
      story: parsedContent.story,
      summary: parsedContent.summary,
      tags_used: Array.isArray(parsedContent.tags_used) ? parsedContent.tags_used : [],
      reading_time_minutes: parsedContent.reading_time_minutes,
    });
  } catch (error) {
    console.error("Edge function error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
