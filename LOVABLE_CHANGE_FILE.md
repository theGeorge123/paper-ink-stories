# Paper & Ink Stories — Episodic Memory + 3-Level Questions (NO edge function changes)

## Do Not Touch
- The existing edge function file/path that generates stories.
- Its exports and request/response contract.
- Any provider logic inside it.

## Goal
Before each bedtime story, ask 3 quick guided questions (Level 1–3), then generate a story that continues from the previous episode using stored memory (hero + last summary + preferences). Store new episode + summary + tags after generation.

## New/Updated Routes
1) Existing `/create` hero flow
- Add guided comfort item selection alongside current hero creation.
- Save hero to persistence.
- Navigate to `/create/questions` once hero creation completes.

2) `/create/questions`
- Load hero + last episode summary + top preference tags.
- Show Level 1 question (3 options) -> then Level 2 -> then Level 3.
- After 3 selections, build a “Story Brief” string and call the existing story generation flow (edge function).
- Navigate to `/read` with result; store episode.

3) `/read`
- Large text read view.
- Buttons:
  - Next bedtime story -> `/create/questions`
  - Edit hero -> `/create`

## Persistence (Prefer existing DB; fallback to localStorage if none)
Data needed per profile:
- profile_id (uuid) stored in localStorage/cookie
- hero fields
- episodes (episode_number, title, story, summary, choices_json, tags_used)
- preferences (tag scores)

## Files Added
- `/lib/storyMemory.ts`
  - loadProfileId()
  - getHero(profileId)
  - saveHero(profileId, hero)
  - getLastEpisode(profileId)
  - saveEpisode(profileId, episode)
  - getTopPreferenceTags(profileId)
  - applyTags(profileId, tagsUsed)

- `/lib/questions.ts`
  - getNextQuestions(profileId)
  - generateQuestionsContext(hero, lastSummary, topTags)
  - createThreeLevelQuestions(context)
  - validateThreeLevelQuestions(...)

- `/lib/buildStoryBrief.ts`
  - buildStoryBrief(hero, lastSummary, topTags, selections)

## Where to Integrate (Existing generation)
- The current story generation is called via `supabase.functions.invoke('generate-page', ...)`.
- The new flow updates character memory/pending choice and creates a story row, then calls the existing edge function without changing it.

## Bedtime Safety Rules (embedded in buildStoryBrief)
- Ages 3–7
- 500–800 words
- Cozy, gentle pacing
- No villains, danger, fear, shouting, urgency, sudden surprises
- No cliffhangers
- End with hero falling asleep safely
- Personalization ONLY from provided hero/summary/tags/selections

## Episode Flow
- If no last episode exists:
  - lastSummary = "None (first episode)."
  - episode_number = 1
- Else:
  - episode_number = last + 1

After generation:
- Parse JSON if possible (existing edge function provides summary/tags on final page).
- Store:
  - title, story, summary, tags_used, reading_time_minutes
  - choices_json = selected options
- Increment preference scores using tags_used + option tags.

## Acceptance Checks
- Each question level shows 3 options only.
- User must pick 1 option per level (3 total) before generating.
- Story continuity references lastSummary when present.
- Edge function untouched and still returns a story.
