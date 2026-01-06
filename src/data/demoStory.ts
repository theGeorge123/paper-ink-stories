// Demo story data for guest mode preview
// Age 1-2 version: Very short, rhythmic, calming, focused on sounds

export const DEMO_CHARACTER = {
  id: 'demo-character',
  name: 'Luna',
  archetype: 'fairy',
  age_band: '1-2',
  traits: ['gentle', 'kind'],
  sidekick_name: 'Pip',
  sidekick_archetype: 'owl',
  hero_image_url: null,
  icon: 'fairy',
  user_id: 'demo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  story_count: 1,
  preferred_themes: ['sleep', 'nature'],
  avoided_themes: [],
  last_summary: null,
  pending_choice: null,
  preferred_language: 'en',
  hero_image_prompt: null,
  hero_image_style: null,
};

export const DEMO_STORY = {
  id: 'demo-story',
  character_id: 'demo-character',
  title: "Luna Says Goodnight",
  length_setting: 'SHORT',
  is_active: false,
  current_page: 3,
  story_state: { location: 'Cozy Nest', inventory: [] },
  themes: ['sleep', 'nature'],
  last_summary: 'Luna said goodnight to all her friends and fell asleep.',
  generated_options: null,
  chosen_option: null,
  child_state_after_story: null,
  reuse_intent_tomorrow: null,
  feedback_submitted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  characters: DEMO_CHARACTER,
};

// Simple, rhythmic pages for age 1-2
export const DEMO_PAGES = [
  {
    id: 'demo-page-1',
    story_id: 'demo-story',
    page_number: 1,
    content: `Shhhh... The moon is out.

Little Luna the fairy yawns.

"Time to sleep," says Pip the owl.

Hoo-hoo. Hoo-hoo.`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-page-2',
    story_id: 'demo-story',
    page_number: 2,
    content: `Luna says goodnight to the flowers.

"Night-night, flowers."

The flowers close their petals.

Soft. Soft. Soft.`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-page-3',
    story_id: 'demo-story',
    page_number: 3,
    content: `Luna snuggles in her cozy nest.

Pip sits nearby. Watching. Watching.

Close your eyes now.

Shhh... Sleep tight.

Goodnight, little one. 🌙`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
];
