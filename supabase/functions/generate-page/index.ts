import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
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

// Input validation schema
const generatePageSchema = z.object({
  storyId: z.string().uuid("Invalid story ID format"),
  targetPage: z.number().int().min(1).max(20).optional(),
});

const STORYBOOK_IMAGE_STYLE = "Storybook illustration, hand-painted watercolor and gouache style, soft paper texture, warm cozy bedtime lighting, gentle edges, child-friendly proportions, simple light background, no text, no logos, no watermark, not photorealistic, not 3D, not anime.";

const SYSTEM_PROMPT = `
You are an expert children's bedtime story author and certified sleep specialist using the "Sleep Engineer" method.
Your stories gently guide children toward sleep through calming narratives perfectly tailored to their age.

CRITICAL: You MUST follow these rules in exact priority order:
1. SAFETY (absolute priority)
2. AGE-SPECIFIC RULES (zero tolerance for violations)
3. STORY PHASE (current page context)
4. SLEEP ENGINEERING (calming effect)
5. CREATIVITY (within above constraints)

═══════════════════════════════════════════════════════════════════════════════
CONTEXT VARIABLES
═══════════════════════════════════════════════════════════════════════════════
You will receive:
- Language: {language} (MUST output in this language ONLY)
- Age Band: {age_band} (STRICT compliance required)
- Story Phase: {phase} (SETUP / JOURNEY / WIND-DOWN)
- Character DNA: name, archetype, personality traits, age band
- Story History: life_summary (previous adventures), preferred_themes, avoided_themes
- Current State: location, inventory, plot_outline

═══════════════════════════════════════════════════════════════════════════════
AGE-SPECIFIC RULES (ZERO TOLERANCE - MUST FOLLOW EXACTLY)
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ AGE 1-2 (BABY/TODDLER) - Sensory Snapshots                                 │
└─────────────────────────────────────────────────────────────────────────────┘

WORD LIMIT: 60-80 words TOTAL per page (STRICT)

SENTENCE STRUCTURE:
✓ 2-4 words maximum per sentence
✓ Simple noun-verb patterns: "Bear sleeps." "Moon shines." "Wind whispers."
✓ Repetitive rhythms: "Soft, soft, soft." "Gentle, gentle, gentle."
✓ Sound words: "Shhh" "Whoosh" "Pat-pat"

CONTENT RULES:
✗ NO plot, goals, intentions, or purposeful actions
✗ NO character thoughts, feelings, or decisions
✗ NO cause-and-effect sequences
✓ ONLY sensory observations: what we see, hear, feel
✓ Present tense only
✓ Concrete, tangible objects only

VOCABULARY:
✓ Basic, familiar words: bed, moon, soft, warm, sleep, quiet
✗ NO abstract concepts
✗ NO adjectives longer than 2 syllables

EXAMPLE (Dutch):
"De maan schijnt.
Zacht licht.
{name} ligt stil.
Warme deken.
Ogen dicht.
Slaap, slaap, slaap."

┌─────────────────────────────────────────────────────────────────────────────┐
│ AGE 3-5 (PRESCHOOLER) - Comforting Routines                                │
└─────────────────────────────────────────────────────────────────────────────┘

WORD LIMIT: 120-150 words TOTAL per page (STRICT)

SENTENCE STRUCTURE:
✓ 5-8 words maximum per sentence
✓ Simple Subject-Verb-Object: "{name} picked up the soft blanket."
✓ Present or past simple tense only
✓ One action per sentence
✓ Use repetition for comfort: "First... Then... Finally..."

CONTENT RULES:
✗ NO complex emotions (fear, anxiety, confusion)
✗ NO metaphors or abstract concepts
✗ NO time concepts beyond "now," "soon," "after"
✓ Familiar settings: home, garden, bedroom
✓ Predictable sequences
✓ Gentle, simple cause-effect: "The bear was tired. So the bear found a bed."

VOCABULARY:
✓ Common, concrete words
✓ Sensory words: soft, warm, quiet, gentle, cozy
✗ NO vocabulary beyond everyday speech
✗ NO multi-syllable adjectives unless very familiar

PARAGRAPH STRUCTURE:
✓ 2-3 short paragraphs maximum
✓ 3-5 sentences per paragraph
✓ Each paragraph = one simple idea

EXAMPLE (English):
"{name} walked to the cozy bed. The blanket was soft and warm. {name} pulled it close.

Outside, the moon was bright. Stars twinkled in the sky. Everything was quiet and safe.

{name} closed tired eyes. It was time to sleep. Goodnight, {name}."

┌─────────────────────────────────────────────────────────────────────────────┐
│ AGE 6-8 (EARLY READER) - Gentle Wonder                                     │
└─────────────────────────────────────────────────────────────────────────────┘

WORD LIMIT: 200-250 words TOTAL per page (STRICT)

SENTENCE STRUCTURE:
✓ 8-12 words per sentence (average)
✓ Compound sentences allowed: "The stars twinkled, and the moon smiled down."
✓ Past tense narrative
✓ Occasional longer descriptive sentence (max 15 words)
✓ Mix sentence lengths for rhythm

CONTENT RULES:
✗ NO suspense, cliffhangers, or tension
✗ NO danger, even implied
✗ NO complex moral dilemmas
✓ Gentle problem-solving: "Where did I leave my toy? Oh, there it is!"
✓ Mild curiosity and discovery
✓ Light magical elements (friendly, never scary)
✓ Simple emotions: happy, sleepy, calm, curious, content

VOCABULARY:
✓ Include exactly 1 "challenge word" per page
✓ Challenge word must be explained in context immediately
✓ Example: "The forest was tranquil—so peaceful and quiet that even the birds whispered."
✗ NO words that create anxiety or fear

PARAGRAPH STRUCTURE:
✓ 3-4 paragraphs
✓ 4-6 sentences per paragraph
✓ Each paragraph develops one scene or moment
✓ Transitional words: "Then," "Next," "Slowly," "Gently"

PACING:
✓ Gradual slowing of action as page progresses
✓ More sensory detail in later paragraphs
✓ Final paragraph always calmer than first

EXAMPLE (Swedish):
"{name} vandrade genom den tysta skogen. Träden stod höga och stilla, som gamla vänner som väntade. Månen lyste mellan grenarna.

{name} hittade en mjuk kudde av mossa vid en stor sten. Den kändes som den perfekta platsen att vila. {name} satte sig ner försiktigt.

Vinden viskade en lugn melodi genom löven. Allt omkring var fridfull—så stilla och trygg att även tankarna blev mjuka. {name}s ögonlock blev tunga.

Det var dags att sova. {name} blundade och lyssnade på vindens sång. Snart kom drömmarnas värld."

┌─────────────────────────────────────────────────────────────────────────────┐
│ AGE 9-12 (PRE-TEEN) - Reflective Calm                                      │
└─────────────────────────────────────────────────────────────────────────────┘

WORD LIMIT: 300-350 words TOTAL per page (STRICT)

SENTENCE STRUCTURE:
✓ 10-15 words per sentence (average)
✓ Complex and compound-complex sentences allowed
✓ Varied sentence rhythm for literary quality
✓ Occasional short sentence for emphasis
✓ Rich, flowing descriptive passages

CONTENT RULES:
✗ NO real danger or high-stakes conflict
✗ NO anxiety-inducing scenarios
✗ NO cliffhangers or unresolved tension
✓ Inner reflection and self-discovery
✓ Gentle character growth
✓ Nuanced emotions: contentment, wonder, peace, gratitude
✓ Sophisticated magical realism (always safe)
✓ Philosophical calm: appreciating beauty, finding peace

VOCABULARY:
✓ Include 1-2 advanced vocabulary words per page
✓ Each advanced word explained through context clues
✓ Example: "The glade was suffused with silver light, as if the moon had painted everything with its gentle glow."
✓ Elevated language appropriate for mature readers
✗ NO overly academic or pretentious vocabulary

PARAGRAPH STRUCTURE:
✓ 4-5 paragraphs
✓ 5-8 sentences per paragraph
✓ Each paragraph explores a distinct moment, thought, or scene
✓ Sophisticated transitions and connections

LITERARY DEVICES:
✓ Gentle metaphors: "The night wrapped around {name} like a soft blanket."
✓ Subtle imagery: sensory details that invite visualization
✓ Internal monologue (brief, calming)
✓ Personification of nature (friendly, never ominous)

PACING:
✓ Contemplative opening
✓ Gradual sensory immersion in middle
✓ Meditative conclusion
✓ Each paragraph slower and softer than the last

EXAMPLE (Dutch):
"{name} stood aan de rand van het stille meer, waar het maanlicht danste over het water als kleine sterren die waren neergedaald op aarde. De lucht was vervuld met de geur van dennenbomen en nachtbloemen, een combinatie zo rustgevend dat het elke gedachte leek te kalmeren.

Er was iets bijzonders aan dit moment, {name} voelde het diep van binnen. De hele dag had {name} gezocht naar antwoorden, maar hier, in de zachte omhelzing van de nacht, leken vragen minder belangrijk. Het was voldoende om gewoon te zijn, om te ademen, om te luisteren naar het zachte gefluister van de wind door de bladeren.

{name} vond een plek bij een oude wilg, waarvan de takken als beschermende armen omlaag hingen. De grond was bedekt met zacht mos, perfect om op te rusten. {name} leunde achterover en keek omhoog naar de sterrenhemel, die oneindige verhalen vertelde in zijn schitterende patronen.

De wereld voelde veilig en goed. Elk geluidje—het ruisen van bladeren, het zachte kabbelen van water, de verre roep van een uil—was deel van een grotere harmonie. {name}s ademhaling werd dieper, langzamer, synchroon met het ritme van de nacht.

En zo, met de maan als stille getuige en de sterren als wachters, liet {name} zich wegzakken in een diepe, vredige slaap. Dromen kwamen zacht aanwaaien, vol van dezelfde magie die de nacht zo mooi had gemaakt."

═══════════════════════════════════════════════════════════════════════════════
STORY PHASE RULES
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ SETUP (First Page)                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

PURPOSE: Establish setting, mood, and gentle direction

REQUIRED ELEMENTS:
✓ Reference life_summary if provided (integrate naturally in opening paragraph)
  - Ages 1-2: Max 6 words OR omit if it breaks age rules
  - Ages 3-5: One simple sentence
  - Ages 6-8: One fluid sentence
  - Ages 9-12: Integrated into narrative flow
✓ Establish current location and time (evening/night)
✓ Introduce tonight's gentle goal or direction
✓ Create calm, safe atmosphere
✓ Set emotional baseline: peaceful, curious, content

TONE: Warm invitation, no urgency

PLOT OUTLINE:
✓ If no plot_outline exists, generate 3-4 simple beats
✓ Each beat should be calming, not escalating
✓ Beats should flow naturally toward rest

┌─────────────────────────────────────────────────────────────────────────────┐
│ JOURNEY (Middle Pages)                                                      │
└─────────────────────────────────────────────────────────────────────────────┘

PURPOSE: Gentle sensory exploration that tires the mind

SLEEP ENGINEER TECHNIQUE - Mental Tiring:
✓ Heavy sensory details (what things feel like, smell like, sound like)
✓ Slow, deliberate movement through space
✓ Focus on textures: "The moss felt like velvet under {name}'s hand"
✓ Gentle sounds: whispers, rustles, soft water
✓ Calming scents: flowers, fresh air, warm bread
✓ Cool or warm sensations: "The breeze was cool on {name}'s cheek"

PACING:
✓ Progressively slower descriptions
✓ More pauses and stillness as pages progress
✓ Shorter sentences as you approach middle-end
✓ Each paragraph should feel like "sinking deeper"

CONTENT:
✓ Follow plot_outline beats
✓ Gentle discoveries, never shocking
✗ NO rising action or tension
✗ NO problems that aren't immediately, gently resolved
✓ Character moves calmly through peaceful scenes

┌─────────────────────────────────────────────────────────────────────────────┐
│ WIND-DOWN (Final Page) - MUST SET is_ending=true                           │
└─────────────────────────────────────────────────────────────────────────────┘

PURPOSE: Guide child into sleep state

SLEEP ENGINEER TECHNIQUE - Drift Off Flow:
✓ Ultra-slow, rhythmic pacing
✓ Long, flowing sentences (if age allows)
✓ Soft consonants: s, m, n, l, w sounds
✓ Lullaby-like rhythm
✓ Repetitive, soothing phrases

REQUIRED PROGRESSION:
1. Character notices tiredness
2. Character finds perfect resting spot
3. Character settles in comfort
4. Sensory details become softer, dimmer
5. Character's eyes grow heavy
6. Character falls asleep (EXPLICIT)

FINAL SENTENCE REQUIREMENTS:
✓ MUST explicitly state sleep: "And {name} slept," "{name} closed their eyes and dreamed," etc.
✓ Ages 1-2: "Sleep, sleep, sleep." or "{name} sleeps."
✓ Ages 3-5: "{name} closed tired eyes and fell asleep."
✓ Ages 6-8: "{name} drifted into peaceful dreams."
✓ Ages 9-12: "{name} surrendered to sleep, breathing soft and slow."

REQUIRED JSON FIELDS (only for WIND-DOWN):
✓ is_ending: true
✓ adventure_summary: One sentence summarizing the entire story
✓ story_themes: ["theme1", "theme2", "theme3"] - 2-3 keywords
✓ next_options: ["Option A", "Option B", "Option C"] - varied, based on preferred_themes

═══════════════════════════════════════════════════════════════════════════════
HISTORY & ADAPTABILITY
═══════════════════════════════════════════════════════════════════════════════

USE life_summary:
✓ Treat as character's memory bank
✓ Reference naturally in SETUP phase
✓ Build continuity: "Last time {name} discovered X, and tonight..."
✗ Don't info-dump or summarize awkwardly

USE preferred_themes:
✓ Incorporate liked themes more frequently
✓ Example: If ["nature", "stars"] are preferred, include night sky, forest settings

AVOID avoided_themes:
✓ Minimize or exclude these themes
✓ Example: If ["loud sounds"] is avoided, keep story quieter

ADAPTIVE STORY DIRECTION:
✓ If child has 10+ stories, reference recurring elements
✓ Build on established character growth
✓ Create gentle callbacks to favorite past adventures

═══════════════════════════════════════════════════════════════════════════════
ABSOLUTE SAFETY RULES (NEVER VIOLATE)
═══════════════════════════════════════════════════════════════════════════════

✗ FORBIDDEN CONTENT:
  - Monsters, villains, antagonists, threats
  - Violence, fighting, conflict, competition
  - Danger, peril, risk, harm (even implied)
  - Darkness, shadows, scary sounds
  - Abandonment, separation, being lost or alone
  - Sadness, fear, anxiety, worry, stress
  - Loud noises, sudden movements, surprises
  - Rain/storms (unless explicitly gentle)
  - Fire (unless contained and cozy like a fireplace)

✓ REQUIRED TONE:
  - Warm, cozy, whisper-like
  - Safe, protected, loved
  - Gentle, slow, peaceful
  - Wonder without excitement
  - Calm curiosity without tension

✓ CONFLICT RESOLUTION:
  - All "problems" are tiny and immediately resolved
  - Example: "Where is my hat? Oh, there it is on the chair."
  - Never create anxiety

═══════════════════════════════════════════════════════════════════════════════
TECHNICAL FORMATTING RULES
═══════════════════════════════════════════════════════════════════════════════

LANGUAGE:
✓ Output MUST be in the specified language ONLY
✓ No code-switching or translation notes

PUNCTUATION:
✗ NEVER use em dash (—) or en dash (–)
✓ Use commas, periods, or rewrite sentence structure

LINE BREAKS:
✓ Use paragraph breaks (\\n\\n) for readability
✓ Ages 1-2: Line break after each sentence
✓ Ages 3-5: Line break between idea groups
✓ Ages 6-8: Standard paragraph breaks
✓ Ages 9-12: Standard paragraph breaks

WORD COUNT COMPLIANCE:
✓ Count EVERY word in page_text
✓ MUST stay within age-specific limits
✓ Better to be slightly under than over

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON - NO MARKDOWN)
═══════════════════════════════════════════════════════════════════════════════

Output ONLY this JSON. No markdown code blocks. No extra text.

{
  "page_text": "Story text in specified language, within word limit...",
  "is_ending": false,
  "adventure_summary": null,
  "story_themes": null,
  "next_options": null,
  "plot_outline": null,
  "new_location": null,
  "new_inventory": null,
  "visual_scene_description": null
}

FIELD RULES:
- page_text: Required, must follow ALL age rules
- is_ending: true ONLY for WIND-DOWN phase, false otherwise
- adventure_summary: Required when is_ending=true, else null
- story_themes: Array of 2-3 strings when is_ending=true, else null
- next_options: Array of 3 strings when is_ending=true, else null
- plot_outline: Array of 3-4 strings ONLY on page 1 if none exists, else null
- new_location: String if character moved to new place, else null
- new_inventory: Array of strings if character gained items, else null
- visual_scene_description: String ONLY at midpoint page for illustration, else null

═══════════════════════════════════════════════════════════════════════════════
REMEMBER: Safety → Age Rules → Phase → Sleep Effect → Creativity
Follow this priority ALWAYS.
═══════════════════════════════════════════════════════════════════════════════
`;

const LENGTH_PAGES = { SHORT: 5, MEDIUM: 9, LONG: 12 };

// Image generation disabled to speed up page generation
const IMAGE_GENERATION_LOGIC = "";

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
  expiresInSeconds = 60 * 60 * 6 // 6 hours for story pages to allow refresh
) {
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds, { download: false });

  if (error || !data?.signedUrl) {
    console.error("Failed to sign URL for", path, error);
    return null;
  }

  return data.signedUrl;
}

function extractImageUrl(imageData: Record<string, unknown>): string | null {
  // Riverflow returns image URLs either as an image array or string content
  const choices = (imageData as { choices?: unknown })?.choices as Array<{
    message?: { content?: unknown; images?: Array<{ url?: string; image_url?: { url?: string } }> };
  }>;
  const content = choices?.[0]?.message?.content;

  if (Array.isArray(content)) {
    type ImageContent = { type?: string; image_url?: { url?: string }; url?: string };
    const imageItem = (content as ImageContent[]).find((item) => item.type === "image_url" || item.type === "image");
    if (imageItem?.image_url?.url) return imageItem.image_url.url;
    if (imageItem?.url) return imageItem.url;
  } else if (typeof content === "string") {
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)/i);
    if (urlMatch) return urlMatch[0];
  }

  const images = choices?.[0]?.message?.images;
  if (images?.[0]?.url) return images[0].url;
  if (images?.[0]?.image_url?.url) return images[0].image_url.url;

  return null;
}

async function downloadImageBuffer(imageUrl: string): Promise<ArrayBuffer | null> {
  if (imageUrl.startsWith("data:image")) {
    const base64Match = imageUrl.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) return null;
    const binaryString = atob(base64Match[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const imageDownload = await fetch(imageUrl);
  if (!imageDownload.ok) return null;
  const imageBlob = await imageDownload.blob();
  return await imageBlob.arrayBuffer();
}

async function generateStoryImage(params: {
  description: string;
  visualAnchor?: string | null;
  storyId: string;
  pageNumber: number;
  userId: string;
}): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openRouterImageKey = Deno.env.get("openrouterimage");

  if (!params.description?.trim()) return null;
  if (!openRouterImageKey || !serviceRoleKey || !supabaseUrl) {
    console.warn("Image generation skipped: missing configuration");
    return null;
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const anchorPrompt = params.visualAnchor?.trim()
    ? ` Maintain hero consistency: ${params.visualAnchor.trim()}.`
    : " Focus on the scenery and lighting.";

  const prompt = `Illustrate this bedtime story scene in storybook_illustration_v1 watercolor style: ${params.description}. Use cozy lighting and cinematic framing.${anchorPrompt} ${STORYBOOK_IMAGE_STYLE}`;
  const promptHash = await hashPrompt(prompt);

  // Check for existing cached image by prompt hash
  const { data: existingAsset } = await adminClient
    .from("image_assets")
    .select("storage_bucket,storage_path")
    .eq("prompt_hash", promptHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingAsset) {
    console.log("Reusing cached scene image for story", params.storyId);
    // Return storage path marker instead of signed URL
    return `storage://${existingAsset.storage_bucket}/${existingAsset.storage_path}`;
  }

  const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterImageKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": supabaseUrl,
    },
    body: JSON.stringify({
      model: "sourceful/riverflow-v2-fast-preview",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!imageResponse.ok) {
    const errorText = await imageResponse.text();
    console.error("OpenRouter image generation failed:", imageResponse.status, errorText);
    return null;
  }

  const imageData = await imageResponse.json();
  const imageUrl = extractImageUrl(imageData);

  if (!imageUrl) {
    console.error("No image URL returned for story image:", JSON.stringify(imageData).slice(0, 1000));
    return null;
  }

  const imageBuffer = await downloadImageBuffer(imageUrl);
  if (!imageBuffer) {
    console.error("Failed to download generated story image");
    return null;
  }

  const storagePath = `${params.userId}/${params.storyId}/page-${params.pageNumber}.png`;
  const { error: uploadError } = await adminClient.storage
    .from("story-images")
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    console.error("Story image upload error:", uploadError);
    return null;
  }

  // Cache the asset with only valid columns
  await adminClient.from("image_assets").insert({
    prompt_hash: promptHash,
    storage_bucket: "story-images",
    storage_path: storagePath,
  });

  // Return storage path marker (not signed URL) so client can generate fresh signed URLs
  return `storage://story-images/${storagePath}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const functionStartTime = Date.now();
  let aiGenerationStartTime: number | null = null;
  let aiGenerationEndTime: number | null = null;
  let aiLatency: number | null = null;
  let retryCount = 0;
  let errorOccurred = false;
  let errorType: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    // Parse and validate input
    const rawInput = await req.json();
    const parseResult = generatePageSchema.safeParse(rawInput);
    
    if (!parseResult.success) {
      console.error("Validation error:", parseResult.error.errors);
      return errorResponse(
        "Invalid input",
        400,
        parseResult.error.errors.map((e) => e.message).join(", "),
      );
    }

    const { storyId, targetPage } = parseResult.data;
    console.log("Generating page for story:", storyId, "target page:", targetPage);

    // Fetch story with character
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*, characters(*)")
      .eq("id", storyId)
      .single();

    if (storyError || !story) {
      console.error("Story fetch error:", storyError);
      return errorResponse("Story not found", 404);
    }

    // Verify ownership through character
    if (story.characters.user_id !== user.id) {
      return errorResponse("Forbidden", 403);
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

    const characterLanguage = (story.characters as { preferred_language?: string }).preferred_language || language;
    const languageName = languageNames[characterLanguage] || languageNames[language] || "English";

    // Fetch existing pages to determine state
    const { data: pagesData } = await supabase
      .from("pages")
      .select("*")
      .eq("story_id", storyId)
      .order("page_number", { ascending: true });

    const pages = pagesData || [];

    // Use targetPage if provided, otherwise next page
    const currentPage = targetPage || pages.length + 1;

    // Check if this page already exists (idempotent)
    const existingPage = pages.find(p => p.page_number === currentPage);
    if (existingPage) {
      console.log(`Page ${currentPage} already exists, returning existing`);

      const storagePath = `${story.characters.user_id}/${storyId}/page-${currentPage}.png`;
      const refreshedUrl = await createSignedUrl(serviceClient, "story-images", storagePath);

      return jsonResponse({
        success: true,
        page_text: existingPage.content,
        is_ending: !story.is_active,
        adventure_summary: story.last_summary || null,
        next_options: story.generated_options || null,
        page_number: currentPage,
        total_pages: LENGTH_PAGES[story.length_setting as keyof typeof LENGTH_PAGES] || 8,
        image_url: refreshedUrl || existingPage.image_url || null,
        already_existed: true,
      });
    }

    // Check credits only for first page (new story generation)
    if (currentPage === 1) {
      // Check if user has active subscription or enough credits
      const { data: hasSubscription, error: subError } = await serviceClient.rpc(
        "has_active_subscription",
        { p_user_id: user.id }
      );

      if (subError) {
        console.error("Failed to check subscription:", subError);
        return errorResponse("Failed to verify account status", 500);
      }

      if (!hasSubscription) {
        // Check credits
        const { data: profileData, error: profileError } = await serviceClient
          .from("profiles")
          .select("credits")
          .eq("id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("Failed to fetch profile:", profileError);
          return errorResponse("Failed to check credits", 500);
        }

        if (profileData.credits < 1) {
          return jsonResponse(
            {
              error: {
                message: "insufficient_credits",
                details: "You need 1 credit to generate a story",
              },
              current_credits: profileData.credits,
              required_credits: 1,
            },
            402, // Payment Required
          );
        }

        // Deduct credits for story generation
        const { data: deductSuccess, error: deductError } = await serviceClient.rpc(
          "deduct_credits_for_story",
          { p_user_id: user.id }
        );

        if (deductError || !deductSuccess) {
          console.error("Failed to deduct credits:", deductError);
          return errorResponse("Failed to deduct credits", 500);
        }

        console.log(`Deducted 1 credit from user ${user.id} for story generation`);
      }
    }
    
    const targetPages = LENGTH_PAGES[story.length_setting as keyof typeof LENGTH_PAGES] || 8;
    const isMidpoint = currentPage === Math.floor(targetPages / 2);
    const isLastPage = currentPage >= targetPages;

    // CUMULATIVE MEMORY: Fetch the character's life_summary (cumulative history)
    // This is stored on the character and grows with each adventure
    const character = story.characters;
    const lifeSummary = character.last_summary || null;
    
    // PREFERENCE LEARNING: Get themes this child likes/dislikes
    const preferredThemes = character.preferred_themes || [];
    const avoidedThemes = character.avoided_themes || [];
    const storyCount = character.story_count || 0;

    // Build character DNA
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

    const visualAnchor = character.visual_description_anchor?.trim() || null;

    // Build story context with plot_outline support
    const storyState = story.story_state || { location: "Home", inventory: [], plot_outline: [] };
    const previousPagesText = pages.map((p: { page_number: number; content: string }) => 
      `Page ${p.page_number}: ${p.content}`
    ).join("\n\n");

    // Extract adaptive question answers from plot_outline if present
    let adaptiveAnswers: Record<string, string> | null = null;
    let regularPlotOutline: string[] = [];
    
    if (storyState.plot_outline?.length) {
      for (const item of storyState.plot_outline) {
        if (typeof item === 'string' && item.startsWith('Adaptive question answers:')) {
          try {
            const jsonStr = item.replace('Adaptive question answers: ', '');
            adaptiveAnswers = JSON.parse(jsonStr);
          } catch (e) {
            console.log("Could not parse adaptive answers:", e);
          }
        } else {
          regularPlotOutline.push(item);
        }
      }
    }

    // Determine story phase for pacing
    const storyProgress = currentPage / targetPages;
    let storyPhase = "SETUP";
    if (storyProgress > 0.6) storyPhase = "WINDDOWN";
    else if (storyProgress > 0.2) storyPhase = "JOURNEY";

    // Build user prompt with all context
    let userPrompt = `
${characterDNA}

## LANGUAGE REQUIREMENT
Write the entire story in ${languageName}. All text including next_options must be in this language.

## CURRENT STORY STATE
- Location: ${storyState.location}
- Items Collected: ${storyState.inventory?.length ? storyState.inventory.join(", ") : "none yet"}
- Plot Outline: ${regularPlotOutline.length ? regularPlotOutline.join(" → ") : "(Generate on page 1)"}
- Story Phase: ${storyPhase} (${Math.round(storyProgress * 100)}% through the story)
- Story Length: ${story.length_setting} (${targetPages} pages total)
- Current Page: ${currentPage} of ${targetPages}
${adaptiveAnswers ? `
## PRE-STORY CHOICES (CRITICAL - USE THESE TO GUIDE THE STORY!)
The reader made these choices before starting:
${Object.entries(adaptiveAnswers).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
Incorporate these preferences into the story naturally.` : ''}

## PREVIOUS PAGES
${previousPagesText || "(This is the very beginning of the story - generate plot_outline!)"}

## TONE
Keep the story calm and soothing, focusing on peaceful, gentle moments with sincere, heartfelt warmth.
    `.trim();

    // Midpoint image generation disabled - skip visual scene prompt

    // CLIFFHANGER INJECTION: If first page and has pending choice, start there
    if (currentPage === 1 && pendingChoice) {
      userPrompt += `

## CLIFFHANGER CONTINUATION (CRITICAL!)
The user previously chose: "${pendingChoice}"
You MUST start this story with ${character.name} doing exactly this action. The first paragraph must show this choice happening.`;
    }

    // CUMULATIVE MEMORY INJECTION: Reference the hero's life history
    if (currentPage === 1 && lifeSummary) {
      userPrompt += `

## HERO'S LIFE HISTORY (CUMULATIVE MEMORY)
${character.name}'s journey so far: "${lifeSummary}"
Naturally weave references to their past experiences throughout the story. This makes the world feel continuous and their growth meaningful.`;
    }

    // Add ending instructions if last page
    if (isLastPage) {
      userPrompt += `

## FINAL PAGE INSTRUCTIONS (CRITICAL!)
This is the FINAL page. You MUST:
1. Wrap up the plot warmly
2. Character must fall asleep feeling safe and loved
3. Set is_ending=true
4. Provide adventure_summary - ONE sentence about what happened in THIS adventure ONLY
5. Provide story_themes - 2-3 keyword themes from this adventure (e.g., ["friendship", "underwater", "treasure"])
6. Provide exactly 3 next_options in ${languageName} - exciting choices for TOMORROW's adventure

## PERSONALIZATION (PREFERENCE LEARNING)
This child has completed ${storyCount} stories with this character.
${preferredThemes.length > 0 ? `✅ THEMES THEY LOVE: ${preferredThemes.join(", ")} - Include more of these!` : ""}
${avoidedThemes.length > 0 ? `❌ THEMES TO AVOID: ${avoidedThemes.join(", ")} - Do NOT suggest these in next_options.` : ""}
${storyCount > 3 ? "They're a returning reader! Make next_options feel fresh and different from past adventures." : ""}
Make next_options VARIED - mix locations, activities, and companions.`;
    }

    // Build the system prompt with variables replaced
    const finalSystemPrompt = SYSTEM_PROMPT
      .replace("{language}", languageName)
      .replace("{age_band}", ageBand)
      .replace("{phase}", storyPhase);

    console.log("Calling OpenRouter API for page", currentPage);
    aiGenerationStartTime = Date.now();

    const OPENROUTER_API_KEY = Deno.env.get("openrouter");
    if (!OPENROUTER_API_KEY) {
      console.error("OpenRouter API key not configured");
      return jsonResponse(
        {
          error: { message: "API configuration error" },
          fallback: true,
          page_text: "The story magic is taking a short nap. Try again in a moment.",
        },
        500,
      );
    }

    const openRouterModel = Deno.env.get("OPENROUTER_STORY_PRESET")?.trim() || "@preset/story-teller";
    
    // Retry logic for transient OpenRouter errors
    const MAX_RETRIES = 3;
    let aiResponse: Response | null = null;
    let lastError = "";
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      retryCount = attempt - 1; // Track retries (0 = first attempt, 1 = first retry, etc.)
      try {
        aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
          },
          body: JSON.stringify({
            model: openRouterModel,
            messages: [
              { role: "system", content: finalSystemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (aiResponse.ok) {
          break; // Success, exit retry loop
        }
        
        lastError = await aiResponse.text();
        console.error(`OpenRouter API error (attempt ${attempt}/${MAX_RETRIES}):`, aiResponse.status, lastError);
        
        // Only retry on 5xx errors (server-side issues)
        if (aiResponse.status < 500) {
          break; // Don't retry client errors (4xx)
        }
        
        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : "Network error";
        console.error(`OpenRouter fetch error (attempt ${attempt}/${MAX_RETRIES}):`, lastError);
        if (attempt < MAX_RETRIES) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!aiResponse || !aiResponse.ok) {
      console.error("OpenRouter API failed after all retries:", lastError);
      return jsonResponse(
        {
          error: { message: "AI generation failed", details: lastError },
          fallback: true,
          page_text: "The story magic is taking a short nap. Try again in a moment.",
        },
        500,
      );
    }

    aiGenerationEndTime = Date.now();
    aiLatency = aiGenerationEndTime - (aiGenerationStartTime || functionStartTime);
    
    const aiData = await aiResponse.json();
    console.log("AI response received for page", currentPage);
    console.log(`[PERF] AI generation latency: ${aiLatency}ms, retries: ${retryCount}`);

    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response (handle markdown code blocks)
    // First try to extract from markdown code blocks
    const codeBlockMatch = content.match(/```json?\s*([\s\S]*?)```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      content = codeBlockMatch[1];
    } else {
      // Try to find the first complete JSON object
      const jsonStartIndex = content.indexOf('{');
      const jsonEndIndex = content.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        content = content.slice(jsonStartIndex, jsonEndIndex + 1);
      }
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content.trim());
    } catch (parseError) {
      // Log the raw response for debugging
      const rawContent = aiData.choices?.[0]?.message?.content || "";
      console.error("Failed to parse AI response. Raw content:", rawContent.substring(0, 500));
      console.error("Extracted content:", content.substring(0, 500));
      return jsonResponse(
        {
          error: { message: "Failed to parse AI response" },
          fallback: true,
          page_text: "The story magic is taking a short nap. Try again in a moment.",
        },
        500,
      );
    }

    const pageImageDescription = isMidpoint ? parsedContent.visual_scene_description : null;
    const pageImageUrl: string | null = null;

    // Use upsert to handle race conditions from background prefetching
    const { error: pageError } = await supabase
      .from("pages")
      .upsert({
        story_id: storyId,
        page_number: currentPage,
        content: parsedContent.page_text,
      }, {
        onConflict: 'story_id,page_number'
      });

    if (pageError) {
      console.error("Page upsert error:", pageError);
      return errorResponse("Failed to save page", 500);
    }

    // Mid-story image generation disabled to speed up page generation
    // Images were only generated at midpoint but added latency without much value

    // Update story state including plot_outline (always sync state for every page)
    const newState = {
      location: parsedContent.new_location || storyState.location,
      inventory: parsedContent.new_inventory || storyState.inventory,
      plot_outline: parsedContent.plot_outline || storyState.plot_outline || [],
    };

    // Force is_ending to true if this is the last page, regardless of AI response
    const finalIsEnding = isLastPage || parsedContent.is_ending || false;

    const storyUpdate: Record<string, unknown> = {
      current_page: currentPage,
      story_state: newState,
    };

    // If ending, save summary, themes, options, and mark inactive
    // Note: The cumulative life_summary update happens in the client when user confirms
    if (finalIsEnding) {
      console.log(`[Story Ending] Marking story ${storyId} as complete (page ${currentPage}/${targetPages})`);

      const cumulativeSummary = parsedContent.adventure_summary
        ? [lifeSummary, parsedContent.adventure_summary].filter(Boolean).join("\n")
        : lifeSummary;

      if (cumulativeSummary) {
        storyUpdate.last_summary = cumulativeSummary;
      }
      storyUpdate.generated_options = parsedContent.next_options || [];
      storyUpdate.is_active = false;
      storyUpdate.themes = parsedContent.story_themes || [];

      // Generate title if not set
      if (!story.title) {
        storyUpdate.title = `${character.name}'s Bedtime Adventure`;
      }

      // Increment story count on character
      await supabase
        .from("characters")
        .update({ story_count: storyCount + 1 })
        .eq("id", character.id);
    }

    const { error: updateError } = await supabase
      .from("stories")
      .update(storyUpdate)
      .eq("id", storyId);

    if (updateError) {
      console.error("Story update error:", updateError);
    }

    if (finalIsEnding && parsedContent.adventure_summary) {
      const cumulativeSummary = [lifeSummary, parsedContent.adventure_summary].filter(Boolean).join("\n");

      const { error: characterUpdateError } = await supabase
        .from("characters")
        .update({ last_summary: cumulativeSummary })
        .eq("id", character.id);

      if (characterUpdateError) {
        console.error("Character summary update error:", characterUpdateError);
      }
    }

    const totalFunctionTime = Date.now() - functionStartTime;
    console.log("Page generated successfully:", currentPage, "of", targetPages);
    console.log(`[PERF] Total function time: ${totalFunctionTime}ms, AI latency: ${aiLatency ?? 'N/A'}ms, retries: ${retryCount}`);

    return jsonResponse({
      success: true,
      page_text: parsedContent.page_text,
      is_ending: finalIsEnding,
      adventure_summary: parsedContent.adventure_summary || null,
      next_options: parsedContent.next_options || null,
      story_themes: parsedContent.story_themes || null,
      page_number: currentPage,
      total_pages: targetPages,
      image_url: pageImageUrl,
    });

  } catch (error) {
    errorOccurred = true;
    errorType = error instanceof Error ? error.constructor.name : "Unknown";
    const totalFunctionTime = Date.now() - functionStartTime;
    console.error("Edge function error:", error);
    console.error(`[PERF] Function failed after ${totalFunctionTime}ms, error type: ${errorType}, retries: ${retryCount}, AI latency: ${aiLatency ?? 'N/A'}ms`);
    return jsonResponse(
      {
        error: { message: error instanceof Error ? error.message : "Unknown error" },
        fallback: true,
        page_text: "The story magic is taking a short nap. Try again in a moment.",
      },
      500,
    );
  }
});
