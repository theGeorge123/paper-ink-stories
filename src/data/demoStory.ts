// Demo story data for guest mode preview
// This provides a complete example story that guests can experience

export const DEMO_CHARACTER = {
  id: 'demo-character',
  name: 'Luna',
  archetype: 'fairy',
  age_band: '6-8',
  traits: ['curious', 'kind', 'brave'],
  sidekick_name: 'Pip',
  sidekick_archetype: 'owl',
  hero_image_url: null, // Will use icon fallback
  icon: 'fairy',
  user_id: 'demo',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  story_count: 1,
  preferred_themes: ['friendship', 'nature'],
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
  title: "Luna's Moonlit Garden",
  length_setting: 'SHORT',
  is_active: false, // Story is complete
  current_page: 4,
  story_state: { location: 'Moonlit Garden', inventory: ['star dust', 'friendship bracelet'] },
  themes: ['friendship', 'nature', 'kindness'],
  last_summary: 'Luna helped the lonely firefly find its family in the moonlit garden.',
  generated_options: null,
  chosen_option: null,
  child_state_after_story: null,
  reuse_intent_tomorrow: null,
  feedback_submitted_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  characters: DEMO_CHARACTER,
};

export const DEMO_PAGES = [
  {
    id: 'demo-page-1',
    story_id: 'demo-story',
    page_number: 1,
    content: `Once upon a time, in a cozy little cottage at the edge of the Whispering Woods, there lived a curious fairy named Luna. She had shimmering wings that sparkled like morning dew, and her best friend was a wise little owl named Pip.

Tonight, the moon was fuller and brighter than Luna had ever seen. It painted the garden in silver light, making every flower glow softly.

"Pip," Luna whispered, "do you see that? The moonflowers are opening!"`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-page-2',
    story_id: 'demo-story',
    page_number: 2,
    content: `Pip ruffled his feathers and hooted softly. "The moonflowers only bloom when someone needs a friend," he said wisely.

Luna fluttered closer to the glowing flowers. Hidden among the petals, she spotted something unexpected—a tiny firefly, sitting all alone, its light flickering sadly.

"Hello there," Luna said gently, kneeling down to the firefly's level. "Are you lost?"

The little firefly blinked. "I... I can't find my family. Their lights were so bright, but now I can't see them anywhere."`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-page-3',
    story_id: 'demo-story',
    page_number: 3,
    content: `Luna looked at Pip, and they both knew what they had to do. "Don't worry," Luna said, sprinkling a bit of star dust from her pouch. "We'll help you find them."

Together, they flew through the moonlit garden—past the sleepy roses, over the dreaming pond, and through the curtain of willow branches.

And there, in the oldest oak tree, dozens of fireflies blinked their warm, golden lights. The little firefly's eyes grew wide with joy.

"That's them! That's my family!"`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-page-4',
    story_id: 'demo-story',
    page_number: 4,
    content: `The firefly family welcomed their little one home with a dance of lights, swirling and twinkling like a hundred tiny stars.

"Thank you, Luna," the little firefly said, giving her a friendship bracelet made of woven moonbeam. "You showed me the way when I was lost."

Luna smiled and yawned, her wings drooping just a little. The moon seemed to shine its approval as Pip led her back home.

Back in her cozy cottage, Luna snuggled into her flower-petal bed. "Goodnight, Pip," she whispered. "Goodnight, moonflowers. Goodnight, fireflies."

And as she drifted off to sleep, she dreamed of dancing lights and new friends yet to meet.

*The End*`,
    image_url: null,
    created_at: new Date().toISOString(),
  },
];
