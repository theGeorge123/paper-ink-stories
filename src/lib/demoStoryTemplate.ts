/**
 * Demo Story Template System
 *
 * Creates instant, personalized bedtime stories using variable substitution.
 * The output is indistinguishable from AI-generated stories in the reader.
 */

import type { DemoHeroInput } from './demoStorage';

type StoryVariables = {
  heroName: string;
  heroType: string;
  trait: string;
  comfortItem: string;
  sidekickName: string | null;
  sidekickType: string | null;
};

export type DemoStoryRecord = {
  id: string;
  title: string;
  pages: string[];
  character_id: string;
  created_at: string;
};

// Story templates with {variable} placeholders
// Each template produces 5 pages of content, matching AI story structure

const STORY_TEMPLATES = [
  // Template 1: The Moonlit Garden Adventure
  {
    title: "{heroName}'s Moonlit Garden",
    pages: [
      `{heroName} the {trait} {heroType} padded to the window as evening stars blinked on, one by one. A soft breeze stirred the curtains, carrying the sweet scent of flowers and the hush of a coming night.

{sidekickIntro}

"I think the garden is ready for us," {heroName} whispered, tucking {heroNamePossessive} {comfortItem} under one arm before slipping outside.`,

      `The garden shimmered in silver moonlight. Fireflies drew gentle loops in the air, and the flowers tucked their petals in as if yawning for bed. Each step felt light and quiet, like walking through a lullaby.

{sidekickMiddle}

A wise old owl watched from the oak tree. "Good evening, little {heroType}," she cooed. "The garden saved its softest wonders for a {trait} heart like yours."`,

      `{heroName} followed a path of smooth stones that glowed faintly under the moon. The {trait} {heroType} paused to listen: the brook murmured a sleepy story to the pebbles, and the leaves rustled a gentle shush-shush.

The air felt cool and kind, wrapping around {heroName} like a cozy blanket. Somewhere nearby, a cricket began a slow, steady song that matched the pace of {heroNamePossessive} breathing.`,

      `Near the center of the garden stood a willow tree, its long branches making a curtain of green. {heroName} brushed the branches aside and found a circle of soft moss, perfectly shaped for resting.

{sidekickEnd}

"This feels just right," {heroName} said softly, settling in with {heroNamePossessive} {comfortItem} tucked close. The willow leaves swayed above like tiny nightlights.`,

      `{heroName} gazed up at the sky and counted the brightest stars. One, two, three... With each number, the {trait} {heroType}'s eyelids grew heavier, as if the night were gently closing them.

"Thank you, moon," {heroName} murmured. The fireflies gathered near, making a warm golden glow. Safe and sleepy in the moonlit garden, {heroName} drifted into the sweetest dreams.`,
    ],
    summary: "{heroName} explored a magical moonlit garden and discovered a cozy resting spot under a willow tree.",
    tags: ['nature', 'peaceful', 'garden', 'nighttime', 'gentle'],
  },

  // Template 2: The Cozy Cloud Kingdom
  {
    title: '{heroName} and the Cloud Kingdom',
    pages: [
      `High above the treetops, a kingdom made of clouds glowed with sunset colors. {heroName} the {trait} {heroType} had heard quiet whispers about it, and tonight the clouds sent a special invitation just for {heroNamePossessive} heart.

{sidekickIntro}

A soft cloud drifted down like a gentle elevator. {heroName} hugged {heroNamePossessive} {comfortItem} and stepped onto its cotton-candy surface.`,

      `The cloud carried {heroName} higher and higher, past sleepy birds and into the warm lavender air. The sky smelled like honey and vanilla, and the first stars blinked hello.

{sidekickMiddle}

Ahead, the Cloud Kingdom appeared: white towers, misty bridges, and friendly cloud creatures waving from every ledge. They smiled as if they had been waiting all day.`,

      `A kind cloud bear with fur as white as snowfall greeted {heroName}. "Welcome, dear {heroType}," he said. "We prepared a special place for our {trait} guest."

He led {heroName} to a hall filled with cloud pillows of every size. Soft music floated through the air, like the sound of gentle rain.`,

      `{heroName} sank into the pillows, each one softer than the last. The ceiling faded from sunset gold to deep, peaceful blue, dotted with tiny lights that twinkled like dream-stars.

{sidekickEnd}

"Each star holds a happy memory," the Cloud Bear whispered. "They glow brightest when someone feels safe."`,

      `Wrapped in cloud softness, {heroName} felt perfectly held. The {trait} {heroType} nestled {heroNamePossessive} {comfortItem} close, listening to the quiet hum of the kingdom.

"Sleep well, little one," the Cloud Bear said. The dream-stars shimmered softly, and {heroName} drifted into warm, floating dreams.`,
    ],
    summary: "{heroName} visited a magical Cloud Kingdom and found the coziest cloud pillows for the sweetest dreams.",
    tags: ['clouds', 'magical', 'cozy', 'floating', 'dreams'],
  },

  // Template 3: The Friendly Forest Friends
  {
    title: "{heroName}'s Forest Lullaby",
    pages: [
      `Twilight settled over the forest like a soft blanket. {heroName} the {trait} {heroType} walked the pine-needle path, listening to the hush of leaves and the distant call of night birds.

{sidekickIntro}

"Let's say goodnight to everyone," {heroName} whispered, holding {heroNamePossessive} {comfortItem} close.`,

      `One by one, the forest friends appeared. A deer family stepped gently from the trees, noses warm and kind. "Sweet dreams, {heroName}," the mother deer said, brushing {heroNamePossessive} cheek.

{sidekickMiddle}

Rabbits hopped up next, their fluffy tails bobbing. The smallest bunny yawned so wide it made {heroName} smile. "We'll walk with you for a while," they promised.`,

      `{heroName} strolled with the rabbits, then with the squirrels, then with a family of friendly hedgehogs. Each friend shared a quiet moment: the squirrels pointed to their leafy nest, and the hedgehogs showed their cozy moss bed.

The forest felt like a warm circle of friends, each one adding a little more peace to the evening.`,

      `At last, {heroName} reached an ancient oak with a hollow just the right size for a {heroType} to rest. The tree's bark was smooth and warm, as if it had been waiting.

{sidekickEnd}

"This is your cozy place," the old oak seemed to hum, and {heroName} curled up with {heroNamePossessive} {comfortItem}.`,

      `An owl began a slow, soothing song. Crickets joined in, and the frogs by the pond added their gentle chorus. The whole forest turned into a lullaby.

Safe among friends and trees, the {trait} {heroType} closed {heroNamePossessive} eyes, ready for dreams as soft as moss and as kind as moonlight.`,
    ],
    summary: "{heroName} said goodnight to forest friends and found a cozy resting spot in an ancient oak tree.",
    tags: ['forest', 'animals', 'friendship', 'nature', 'peaceful'],
  },
];

/**
 * Generates article text for sidekick references based on hero type
 */
const getArticle = (type: string): string => {
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const firstLetter = type.toLowerCase().charAt(0);
  return vowels.includes(firstLetter) ? 'an' : 'a';
};

/**
 * Generates possessive form of the hero name
 */
const getPossessive = (name: string): string => {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
};

/**
 * Generates sidekick intro paragraph based on whether sidekick exists
 */
const getSidekickIntro = (vars: StoryVariables): string => {
  if (!vars.sidekickName || !vars.sidekickType) {
    return `{heroName} took a calming breath, feeling {heroNamePossessive} {comfortItem} warm and familiar.`;
  }
  return `{sidekickName} the {sidekickType} padded along beside {heroName}, ${getArticle(vars.sidekickType!)} loyal companion with a {trait} sparkle in their eyes. "This is going to be wonderful," {sidekickName} said.`;
};

/**
 * Generates sidekick middle paragraph
 */
const getSidekickMiddle = (vars: StoryVariables): string => {
  if (!vars.sidekickName || !vars.sidekickType) {
    return `{heroName} smiled quietly, letting the peaceful sounds guide each step.`;
  }
  return `{sidekickName} stayed close, the {sidekickType}'s presence a gentle comfort. "I'm right here," {sidekickName} whispered, and {heroName} nodded with a {trait} grin.`;
};

/**
 * Generates sidekick ending paragraph
 */
const getSidekickEnd = (vars: StoryVariables): string => {
  if (!vars.sidekickName || !vars.sidekickType) {
    return `{heroName} felt perfectly ready for rest, cozy and safe.`;
  }
  return `{sidekickName} curled up nearby, the {sidekickType}'s breathing slow and steady. "Goodnight, {heroName}," {sidekickName} murmured.`;
};

/**
 * Replaces all template variables with actual values
 */
const replaceVariables = (text: string, vars: StoryVariables): string => {
  let result = text;

  // First, substitute sidekick-specific blocks
  result = result.replace(/{sidekickIntro}/g, getSidekickIntro(vars));
  result = result.replace(/{sidekickMiddle}/g, getSidekickMiddle(vars));
  result = result.replace(/{sidekickEnd}/g, getSidekickEnd(vars));

  // Then substitute simple variables
  result = result.replace(/{heroName}/g, vars.heroName);
  result = result.replace(/{heroType}/g, vars.heroType.toLowerCase());
  result = result.replace(/{trait}/g, vars.trait.toLowerCase());
  result = result.replace(/{comfortItem}/g, vars.comfortItem.toLowerCase());
  result = result.replace(/{heroNamePossessive}/g, getPossessive(vars.heroName));

  if (vars.sidekickName) {
    result = result.replace(/{sidekickName}/g, vars.sidekickName);
  }
  if (vars.sidekickType) {
    result = result.replace(/{sidekickType}/g, vars.sidekickType.toLowerCase());
  }

  return result;
};

/**
 * Generates a complete demo story from hero input
 */
export const generateDemoStory = (hero: DemoHeroInput): DemoStoryRecord => {
  const template = STORY_TEMPLATES[Math.floor(Math.random() * STORY_TEMPLATES.length)];

  const variables: StoryVariables = {
    heroName: hero.heroName,
    heroType: hero.heroType,
    trait: hero.heroTrait?.split(',')[0]?.trim() || 'curious',
    comfortItem: hero.comfortItem?.trim() || 'blanket',
    sidekickName: hero.sidekickName || null,
    sidekickType: hero.sidekickArchetype || null,
  };

  const processedPages = template.pages.map((page) => replaceVariables(page, variables));

  return {
    id: `demo-${Date.now()}`,
    title: replaceVariables(template.title, variables),
    pages: processedPages,
    character_id: 'demo',
    created_at: new Date().toISOString(),
  };
};
