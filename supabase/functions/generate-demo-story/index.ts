import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateDemoSchema = z.object({
  demoId: z.string().uuid("Invalid demo ID format"),
  selections: z.object({
    level1: z.string().min(1),
    level2: z.string().min(1),
    level3: z.string().min(1),
  }),
  selectionTags: z.array(z.string().min(1)).optional(),
  language: z.string().max(10).optional(),
});

const SYSTEM_PROMPT = `
You are an expert children's author and sleep specialist applying the "Sleep Engineer" method.

SYSTEM SAFETY: Strictly child-friendly, cozy bedtime tone, no violence or scary themes.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "story_text": "The full bedtime story with paragraph breaks...",
  "episode_summary": "A 2-3 sentence summary of the adventure.",
  "story_themes": ["theme1", "theme2", "theme3"]
}
`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  nl: "Dutch (Nederlands)",
  sv: "Swedish (Svenska)",
};

const buildStoryPrompt = (params: {
  heroName: string;
  heroType: string;
  heroTrait: string;
  comfortItem: string;
  ageBand: string;
  sidekickName?: string | null;
  sidekickArchetype?: string | null;
  lastSummary: string;
  topTags: string[];
  selections: { level1: string; level2: string; level3: string };
  language: string;
}) => {
  const tagLine = params.topTags.length > 0 ? params.topTags.join(", ") : "None yet";
  const sidekickLine = params.sidekickName
    ? `Sidekick: ${params.sidekickName} (${params.sidekickArchetype || "friend"})`
    : "Sidekick: None";

  return `
Write a calming bedtime story in ${params.language} for age band ${params.ageBand}.

HERO DETAILS
- Name: ${params.heroName}
- Type: ${params.heroType}
- Trait: ${params.heroTrait}
- Comfort item: ${params.comfortItem}
- ${sidekickLine}

MEMORY
- Last episode summary: ${params.lastSummary}
- Top preference tags: ${tagLine}

TONIGHT'S CHOICES
1) ${params.selections.level1}
2) ${params.selections.level2}
3) ${params.selections.level3}

HARD RULES
- 500–800 words
- Calm pacing with cozy imagery and gentle sensory detail
- No villains, danger, fear, shouting, urgency, or sudden surprises
- End with the hero falling asleep safely
- Include natural paragraph breaks

Return only JSON matching the required format.
  `.trim();
};

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
      return new Response(JSON.stringify({
        error: "Invalid input",
        details: parseResult.error.errors.map((err) => err.message).join(", "),
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { demoId, selections, selectionTags, language } = parseResult.data;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !openRouterKey) {
      return new Response(JSON.stringify({
        error: "Missing configuration",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await adminClient
      .from("demo_profiles")
      .select("id, stories_used")
      .eq("id", demoId)
      .maybeSingle();

    const storiesUsed = profile?.stories_used ?? 0;

    if (storiesUsed >= 3) {
      return new Response(JSON.stringify({
        error: "limit_reached",
        stories_used: storiesUsed,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!profile) {
      await adminClient.from("demo_profiles").insert({ id: demoId });
    }

    const { data: hero, error: heroError } = await adminClient
      .from("demo_hero")
      .select("*")
      .eq("profile_id", demoId)
      .maybeSingle();

    if (heroError || !hero) {
      return new Response(JSON.stringify({ error: "Hero not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lastEpisode } = await adminClient
      .from("demo_episodes")
      .select("episode_summary, episode_number")
      .eq("profile_id", demoId)
      .order("episode_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: preferences } = await adminClient
      .from("demo_preferences")
      .select("tag, score")
      .eq("profile_id", demoId)
      .order("score", { ascending: false })
      .limit(5);

    const topTags = (preferences ?? []).map((item) => item.tag);
    const resolvedLanguage = LANGUAGE_NAMES[language ?? "en"] || "English";
    const lastSummary = lastEpisode?.episode_summary || "None (first episode).";

    const userPrompt = buildStoryPrompt({
      heroName: hero.hero_name,
      heroType: hero.hero_type,
      heroTrait: hero.hero_trait,
      comfortItem: hero.comfort_item,
      ageBand: hero.age_band,
      sidekickName: hero.sidekick_name,
      sidekickArchetype: hero.sidekick_archetype,
      lastSummary,
      topTags,
      selections,
      language: resolvedLanguage,
    });

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
        max_tokens: 1600,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenRouter API error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({
        error: "AI generation failed",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    content = parseJsonResponse(content);

    let parsedContent: { story_text?: string; episode_summary?: string; story_themes?: string[] };
    try {
      parsedContent = JSON.parse(content.trim());
    } catch (error) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({
        error: "Failed to parse AI response",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsedContent.story_text || !parsedContent.episode_summary) {
      return new Response(JSON.stringify({
        error: "Invalid AI response",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const episodeNumber = storiesUsed + 1;
    const storyThemes = Array.isArray(parsedContent.story_themes) ? parsedContent.story_themes : [];
    const tagsUsed = Array.from(new Set([...(selectionTags ?? []), ...storyThemes]));

    await adminClient
      .from("demo_episodes")
      .insert({
        profile_id: demoId,
        episode_number: episodeNumber,
        story_text: parsedContent.story_text,
        episode_summary: parsedContent.episode_summary,
        choices_json: selections,
        tags_used: tagsUsed,
      });

    await adminClient
      .from("demo_profiles")
      .update({
        stories_used: episodeNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", demoId);

    if (tagsUsed.length > 0) {
      const { data: existingPrefs } = await adminClient
        .from("demo_preferences")
        .select("tag, score")
        .eq("profile_id", demoId)
        .in("tag", tagsUsed);

      const scoreMap = new Map((existingPrefs ?? []).map((entry) => [entry.tag, entry.score]));
      const updatedPrefs = tagsUsed.map((tag) => ({
        profile_id: demoId,
        tag,
        score: (scoreMap.get(tag) ?? 0) + 1,
        updated_at: new Date().toISOString(),
      }));

      await adminClient
        .from("demo_preferences")
        .upsert(updatedPrefs, { onConflict: "profile_id,tag" });
    }

    return new Response(JSON.stringify({
      story_text: parsedContent.story_text,
      episode_summary: parsedContent.episode_summary,
      story_themes: storyThemes,
      tags_used: tagsUsed,
      episode_number: episodeNumber,
      stories_used: episodeNumber,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
