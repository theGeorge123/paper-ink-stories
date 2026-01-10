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
// Each template produces 5-6 pages of content, matching AI story structure

const STORY_TEMPLATES = [
  // Template 1: The Moonlit Garden Adventure
  {
    title: "{heroName}'s Moonlit Garden",
    pages: [
      `{heroName} the {trait} {heroType} yawned softly as the evening stars began to twinkle outside the cozy window. The day had been full of wonderful adventures, but now it was time for the most magical hour—the hour when the garden came alive with gentle moonlight.

{sidekickIntro}

"I wonder what secrets the garden holds tonight," {heroName} whispered, {heroNamePossessive} eyes sparkling with quiet curiosity. The moon seemed to smile back, casting a silvery glow over everything it touched.`,

      `Stepping onto the soft grass, {heroName} felt the cool evening air wrap around like a gentle hug. Fireflies danced in lazy circles, their tiny lights blinking hello. The flowers had closed their petals for the night, tucking themselves in just like little children.

{sidekickMiddle}

A wise old owl hooted softly from the oak tree. "Good evening, little {heroType}," she cooed. "The garden has been waiting for you." {heroName} smiled, feeling warm and welcome in this peaceful place.`,

      `{heroName} followed a winding path of smooth stones that glowed faintly in the moonlight. Each step made a soft sound, like a whispered lullaby. The {trait} {heroType} noticed how everything in the garden seemed to be getting ready for sleep.

The roses swayed gently, humming a quiet tune. The brook babbled softly, telling bedtime stories to the pebbles. Even the wind had slowed to a gentle breeze, rustling the leaves with a soothing shush-shush sound.`,

      `Near the center of the garden stood a magnificent willow tree, its long branches creating a cozy curtain all around. {heroName} parted the branches carefully and discovered the most wonderful sight—a circle of soft moss, perfect for resting.

{sidekickEnd}

"This is my favorite spot," {heroName} murmured, settling down onto the cushiony moss. The willow branches swayed overhead like a natural mobile, and the stars peeked through the leaves like tiny nightlights.`,

      `{heroName} gazed up at the night sky, counting the brightest stars. One, two, three... The {trait} {heroType}'s eyelids grew heavy with each number. The garden sang a soft chorus of crickets and gentle winds.

"Thank you for this beautiful night," {heroName} whispered to the moon. The fireflies gathered closer, creating a warm, golden glow. Safe and loved, surrounded by the magic of the moonlit garden, {heroName} drifted into the sweetest of dreams.

The stars twinkled their approval, and somewhere, an owl hooted a soft goodnight.`,
    ],
    summary: "{heroName} explored a magical moonlit garden and discovered a cozy resting spot under a willow tree.",
    tags: ["nature", "peaceful", "garden", "nighttime", "gentle"],
  },

  // Template 2: The Cozy Cloud Kingdom
  {
    title: "{heroName} and the Cloud Kingdom",
    pages: [
      `High above the treetops, where the sunset painted the sky in shades of pink and gold, there floated a kingdom made entirely of clouds. {heroName} the {trait} {heroType} had heard whispers about this magical place, and tonight, the clouds had sent a special invitation.

{sidekickIntro}

A soft, fluffy cloud drifted down like a gentle elevator. "Hop on," it seemed to say, and {heroName} climbed aboard, feeling the cloud's cotton-candy softness beneath {heroNamePossessive} feet.`,

      `The cloud carried {heroName} higher and higher, past sleepy birds returning to their nests, past the first twinkling stars appearing in the darkening sky. The air grew warmer and smelled of honey and lavender.

{sidekickMiddle}

The Cloud Kingdom appeared before them—a wonderland of soft white towers and bridges made of mist. Cloud creatures waved hello: fluffy bunnies, cotton sheep, and the gentlest dragons {heroName} had ever seen, their breath making tiny rainbows instead of fire.`,

      `The king of the Cloud Kingdom was a kind old bear with fur as white as snow. "Welcome, dear {heroType}," he said with a warm smile. "We've prepared something special for our {trait} guest."

He led {heroName} to a great hall where cloud pillows of every size and shape were arranged in a cozy nest. Soft music played—the sound of gentle rain and distant thunder, like nature's own lullaby.`,

      `{heroName} sank into the cloud pillows, each one softer than the last. The ceiling of the hall slowly turned from sunset colors to deep, peaceful blue, dotted with glowing stars that the cloud creatures had collected just for this moment.

{sidekickEnd}

"These stars are for sweet dreams," the Cloud King explained, his voice as soothing as a warm blanket. "Each one holds a happy memory, ready to share with sleeping visitors."`,

      `The cloud pillows wrapped around {heroName} like the coziest hug. The {trait} {heroType} felt perfectly safe, floating on the softest bed in all the world. The gentle cloud creatures gathered around, humming a quiet melody.

"Sleep well, little one," whispered the Cloud King. "The kingdom will watch over you until morning."

{heroName} smiled peacefully, eyes closing. Above, the dream-stars began to twinkle their bedtime stories, and the Cloud Kingdom filled with the sweetest, softest silence of a world at rest.`,
    ],
    summary: "{heroName} visited a magical Cloud Kingdom and found the coziest cloud pillows for the sweetest dreams.",
    tags: ["clouds", "magical", "cozy", "floating", "dreams"],
  },

  // Template 3: The Friendly Forest Friends
  {
    title: "{heroName}'s Forest Lullaby",
    pages: [
      `The forest at twilight was the most peaceful place {heroName} knew. As the sun dipped below the trees, painting everything in warm golden light, the {trait} {heroType} padded softly down the familiar path of pine needles.

{sidekickIntro}

The trees seemed to lean in closer, their leaves whispering secrets of the day. A gentle breeze carried the sweet scent of wildflowers and fresh rain.`,

      `One by one, the forest friends came to say goodnight. First came the deer family, moving silently on soft hooves. "Sweet dreams, dear {heroName}," the mother deer said, touching {heroNamePossessive} nose gently with her own.

{sidekickMiddle}

Then the rabbits appeared, their fluffy tails bobbing as they hopped closer. The youngest bunny yawned hugely, already ready for bed. "We're heading to our burrow," they said. "Will you walk with us a while?"`,

      `{heroName} walked with the rabbits, then the squirrels, then a family of friendly hedgehogs. Each friend had their own cozy home to return to, and each shared a piece of their evening peace.

The squirrels showed {heroName} their nest high in an oak tree. "It's made of the softest leaves," they explained proudly. The hedgehogs' home was a snug hollow beneath a log, lined with moss and dried flowers.`,

      `As the last light faded, {heroName} reached a special clearing where an ancient oak tree stood. Its trunk was wide and welcoming, with a natural hollow just the right size for a {trait} {heroType} to curl up in.

{sidekickEnd}

The tree seemed to wrap its branches around protectively. "Rest here, little one," the old oak seemed to say. "I have watched over forest friends for a hundred years."`,

      `{heroName} settled into the cozy hollow, feeling the tree's gentle strength all around. The bark was surprisingly soft, worn smooth by generations of forest friends who had rested here before.

Above, an owl began to sing a low, soothing song. The crickets joined in, and the frogs by the distant pond added their chorus. The whole forest was singing {heroName} to sleep.

Warm, safe, and surrounded by friends, the {trait} {heroType} closed {heroNamePossessive} eyes. Tomorrow would bring new adventures, but for now, there was only peace, and the gentle lullaby of the forest.`,
    ],
    summary: "{heroName} said goodnight to forest friends and found a cozy resting spot in an ancient oak tree.",
    tags: ["forest", "animals", "friendship", "nature", "peaceful"],
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
    return `The {heroType}'s heart felt full of warmth as the adventure began.`;
  }
  return `{sidekickName} the {sidekickType} padded along beside {heroName}, ${getArticle(vars.sidekickType!)} loyal companion in every adventure. "This is going to be wonderful," {sidekickName} said with a cheerful smile.`;
};

/**
 * Generates sidekick middle paragraph
 */
const getSidekickMiddle = (vars: StoryVariables): string => {
  if (!vars.sidekickName || !vars.sidekickType) {
    return `{heroName} took a deep breath, feeling grateful for this peaceful moment.`;
  }
  return `{sidekickName} stayed close by, the {sidekickType}'s presence a constant comfort. "Isn't this amazing?" {sidekickName} whispered, and {heroName} nodded happily.`;
};

/**
 * Generates sidekick ending paragraph
 */
const getSidekickEnd = (vars: StoryVariables): string => {
  if (!vars.sidekickName || !vars.sidekickType) {
    return `{heroName} smiled contentedly, ready for rest.`;
  }
  return `{sidekickName} curled up nearby, the {sidekickType}'s gentle breathing a soothing rhythm. "Goodnight, {heroName}," {sidekickName} murmured sleepily.`;
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
