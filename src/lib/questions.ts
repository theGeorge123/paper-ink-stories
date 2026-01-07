import { getHero, getLastEpisode, getTopPreferenceTags, loadProfileId, type HeroProfile } from './storyMemory';

export type QuestionOption = {
  id: string;
  label: string;
  tags: string[];
};

export type QuestionLevel = {
  question: string;
  options: [QuestionOption, QuestionOption, QuestionOption];
};

export type ThreeLevelQuestions = {
  level1: QuestionLevel;
  level2: QuestionLevel;
  level3: QuestionLevel;
};

export type QuestionContext = {
  hero: HeroProfile | null;
  lastSummary: string;
  topTags: string[];
  language?: string;
};

const createOption = (id: string, label: string, tags: string[]): QuestionOption => ({
  id,
  label,
  tags,
});

export const generateQuestionsContext = (
  hero: HeroProfile | null,
  lastSummary: string,
  topTags: string[],
  language?: string,
): QuestionContext => ({
  hero,
  lastSummary,
  topTags,
  language,
});

const heroLabel = (hero: HeroProfile | null) => hero?.heroName?.trim() || 'your hero';

const copyForLanguage = (language?: string) => {
  switch (language) {
    case 'nl':
      return {
        level1Question: (heroName: string) => `Waar voelt ${heroName} zich vanavond extra knus?`,
        level2Question: (heroName: string) => `Welke rustige activiteit wil ${heroName} doen voor het slapen?`,
        level3Question: (heroName: string) => `Wie blijft bij ${heroName} tijdens het laatste slaperige moment?`,
        options: {
          level1: [
            ['Een stille bosopen plek met zacht mos', ['forest', 'cozy', 'nature']],
            ['Een sterrenweide met zachte vuurvliegjes', ['meadow', 'stars', 'glow']],
            (comfort: string) => [`Een warm hoekje naast een kleine ${comfort}`, ['home', 'comfort', 'warmth']],
          ],
          level2: [
            ['Luisteren naar een wiegeliedje op de bries', ['music', 'breeze', 'calm']],
            (heroType: string) => [`Een rustige snack delen met een vriendelijke ${heroType}`, ['sharing', 'friendship', 'gentle']],
            ['Langzame, twinkelende lichtjes voorbij zien drijven', ['twinkle', 'wonder', 'slow']],
          ],
          level3: [
            ['Een lieve schildpad die zachte verhaaltjes houdt', ['companion', 'turtle', 'stories']],
            ['Een kleine uil die een kalm deuntje neuriet', ['owl', 'soothing', 'companionship']],
            (comfort: string) => [`Een zachte vriend met een kleine ${comfort}`, ['friend', 'comfort', 'safe']],
          ],
        },
      };
    case 'sv':
      return {
        level1Question: (heroName: string) => `Var vill ${heroName} känna sig extra ombonad i kväll?`,
        level2Question: (heroName: string) => `Vilken lugn aktivitet vill ${heroName} göra innan sömnen?`,
        level3Question: (heroName: string) => `Vem stannar hos ${heroName} under den sista sömniga stunden?`,
        options: {
          level1: [
            ['En stilla skogsglänta med mjuk mossa', ['forest', 'cozy', 'nature']],
            ['En stjärnig äng med mjuka eldflugor', ['meadow', 'stars', 'glow']],
            (comfort: string) => [`En varm vrå bredvid en liten ${comfort}`, ['home', 'comfort', 'warmth']],
          ],
          level2: [
            ['Lyssna på en vaggvisa som bärs av vinden', ['music', 'breeze', 'calm']],
            (heroType: string) => [`Dela ett lugnt mellanmål med en vänlig ${heroType}`, ['sharing', 'friendship', 'gentle']],
            ['Se långsamma, glimrande ljusdrömmar passera', ['twinkle', 'wonder', 'slow']],
          ],
          level3: [
            ['En vänlig sköldpadda som älskar mjuka sagor', ['companion', 'turtle', 'stories']],
            ['En liten uggla som nynnar en lugn melodi', ['owl', 'soothing', 'companionship']],
            (comfort: string) => [`En mjuk vän som bär en liten ${comfort}`, ['friend', 'comfort', 'safe']],
          ],
        },
      };
    default:
      return {
        level1Question: (heroName: string) => `Where should ${heroName} feel extra cozy tonight?`,
        level2Question: (heroName: string) => `What calm activity should ${heroName} enjoy before sleep?`,
        level3Question: (heroName: string) => `Who should join ${heroName} for the final sleepy moment?`,
        options: {
          level1: [
            ['A quiet forest glade with soft moss', ['forest', 'cozy', 'nature']],
            ['A starlit meadow with gentle fireflies', ['meadow', 'stars', 'glow']],
            (comfort: string) => [`A warm nook beside a little ${comfort}`, ['home', 'comfort', 'warmth']],
          ],
          level2: [
            ['Listening to a lullaby carried by the breeze', ['music', 'breeze', 'calm']],
            (heroType: string) => [`Sharing a quiet snack with a friendly ${heroType} neighbor`, ['sharing', 'friendship', 'gentle']],
            ['Watching slow, twinkling lights drift by', ['twinkle', 'wonder', 'slow']],
          ],
          level3: [
            ['A kind turtle who loves soft stories', ['companion', 'turtle', 'stories']],
            ['A tiny owl who hums a soothing tune', ['owl', 'soothing', 'companionship']],
            (comfort: string) => [`A gentle friend who carries a little ${comfort}`, ['friend', 'comfort', 'safe']],
          ],
        },
      };
  }
};

export const createThreeLevelQuestions = (context: QuestionContext): ThreeLevelQuestions => {
  const heroName = heroLabel(context.hero);
  const heroType = context.hero?.heroType?.toLowerCase() || 'friend';
  const comfort = context.hero?.comfortItem?.toLowerCase() || 'blanket';
  const copy = copyForLanguage(context.language);

  return {
    level1: {
      question: copy.level1Question(heroName),
      options: [
        createOption('level1-option1', copy.options.level1[0][0], copy.options.level1[0][1] as string[]),
        createOption('level1-option2', copy.options.level1[1][0], copy.options.level1[1][1] as string[]),
        createOption('level1-option3', ...(() => {
          const option = copy.options.level1[2](comfort);
          return [option[0], option[1]];
        })()),
      ],
    },
    level2: {
      question: copy.level2Question(heroName),
      options: [
        createOption('level2-option1', copy.options.level2[0][0], copy.options.level2[0][1] as string[]),
        createOption('level2-option2', ...(() => {
          const option = copy.options.level2[1](heroType);
          return [option[0], option[1]];
        })()),
        createOption('level2-option3', copy.options.level2[2][0], copy.options.level2[2][1] as string[]),
      ],
    },
    level3: {
      question: copy.level3Question(heroName),
      options: [
        createOption('level3-option1', copy.options.level3[0][0], copy.options.level3[0][1] as string[]),
        createOption('level3-option2', copy.options.level3[1][0], copy.options.level3[1][1] as string[]),
        createOption('level3-option3', ...(() => {
          const option = copy.options.level3[2](comfort);
          return [option[0], option[1]];
        })()),
      ],
    },
  };
};

export const validateThreeLevelQuestions = (questions: ThreeLevelQuestions): boolean => {
  const levels = [questions.level1, questions.level2, questions.level3];
  return levels.every((level) =>
    level.options.length === 3 && level.options.every((option) => option.tags.length > 0),
  );
};

export const getNextQuestions = (profileId?: string | null, language?: string): ThreeLevelQuestions => {
  const resolvedProfileId = profileId ?? loadProfileId();
  const hero = getHero(resolvedProfileId);
  const lastEpisode = getLastEpisode(resolvedProfileId);
  const lastSummary = lastEpisode?.episodeSummary || 'None (first episode).';
  const topTags = getTopPreferenceTags(resolvedProfileId);
  const context = generateQuestionsContext(hero, lastSummary, topTags, language);
  const questions = createThreeLevelQuestions(context);

  if (!validateThreeLevelQuestions(questions)) {
    throw new Error('Question generation failed: each level must have exactly 3 options.');
  }

  return questions;
};
