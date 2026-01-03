import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { sanitizeStoryText } from "../_shared/textSanitizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generationRequestSchema = z.object({
  storyId: z.string().uuid(),
});

const LENGTH_PAGES = {
  SHORT: 5,
  MEDIUM: 9,
  LONG: 12,
};

type StoryRecord = {
  id: string;
  character_id: string;
  user_id: string | null;
  age_band: string | null;
  length: string | null;
  length_setting: string | null;
  total_pages: number;
  status: string | null;
  story_route: string | null;
};

type CharacterRecord = {
  id: string;
  name: string;
  age_band: string;
  user_id: string;
};

function buildPageText(params: {
  character: CharacterRecord;
  pageIndex: number;
  totalPages: number;
  route: "A" | "B" | "C";
}) {
  const { character, pageIndex, totalPages, route } = params;
  const pageNumber = pageIndex + 1;
  const closingLine = pageNumber === totalPages
    ? `${character.name} drifted into a gentle sleep, dreaming of tomorrow.`
    : `${character.name} felt cozy and calm, ready for what comes next.`;

  const routeMood = {
    A: "a quiet night at home",
    B: "a peaceful walk in nature",
    C: "a soft wonder under the stars",
  } as const;

  return [
    `${character.name}'s bedtime story (page ${pageNumber} of ${totalPages}).`,
    `${routeMood[route as keyof typeof routeMood] ?? "a calm evening"}.`,
    `Age band ${character.age_band} comfort pace with soft words.`,
    closingLine,
  ].join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!authHeader || !token) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const userResult = await adminClient.auth.getUser(token);
    if (userResult.error || !userResult.data.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = generationRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { storyId } = parsed.data;

    console.log("Fetching story:", storyId);

    const { data: story, error: storyError } = await adminClient
      .from("stories")
      .select("id, character_id, user_id, age_band, length, length_setting, total_pages, status, story_route, characters!inner(user_id, name, age_band)")
      .eq("id", storyId)
      .single();

    if (storyError || !story) {
      console.error("Story lookup failed", storyError);
      return new Response(JSON.stringify({ error: "Story not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract character from the join - Supabase returns it as a single object when using !inner
    const characterData = story.characters as unknown as CharacterRecord;
    const character: CharacterRecord = Array.isArray(characterData) ? characterData[0] : characterData;

    if (character.user_id !== userResult.data.user.id && story.user_id && story.user_id !== userResult.data.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalPages = story.total_pages || LENGTH_PAGES[(story.length_setting as keyof typeof LENGTH_PAGES) ?? "SHORT"] || 5;

    console.log("Generating pages for story:", storyId, "totalPages:", totalPages);

    // Fetch already generated pages from the 'pages' table
    const { data: existingPages } = await adminClient
      .from("pages")
      .select("page_number")
      .eq("story_id", storyId);

    const generated = new Set((existingPages ?? []).map((p) => p.page_number));
    const pagesToGenerate: { story_id: string; page_number: number; content: string }[] = [];

    for (let i = 0; i < totalPages; i++) {
      const pageNumber = i + 1; // pages use 1-indexed page_number
      if (generated.has(pageNumber)) continue;
      const text = buildPageText({ character, pageIndex: i, totalPages, route: (story.story_route as "A" | "B" | "C") ?? "A" });
      pagesToGenerate.push({ story_id: storyId, page_number: pageNumber, content: sanitizeStoryText(text) });
    }

    console.log("Pages to generate:", pagesToGenerate.length);

    if (pagesToGenerate.length > 0) {
      const { error: insertError } = await adminClient
        .from("pages")
        .upsert(pagesToGenerate, { onConflict: "story_id,page_number" });

      if (insertError) {
        console.error("Failed to persist story pages", insertError);
        await adminClient
          .from("stories")
          .update({ status: "failed" })
          .eq("id", storyId);

        return new Response(JSON.stringify({ error: "Failed to save pages" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await adminClient
      .from("stories")
      .update({ status: "ready", total_pages: totalPages, user_id: character.user_id, age_band: character.age_band, length: story.length ?? story.length_setting })
      .eq("id", storyId);

    console.log("Story generation complete:", storyId);

    return new Response(
      JSON.stringify({ status: "ok", generatedPages: pagesToGenerate.length, totalPages }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unhandled generation error", error);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
