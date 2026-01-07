import type { HeroProfile } from './storyMemory';

export type StorySelections = {
  level1: string;
  level2: string;
  level3: string;
};

export type StoryBriefInput = {
  hero: HeroProfile;
  lastSummary: string;
  topTags: string[];
  selections: StorySelections;
  language?: string;
};

const copyForLanguage = (language?: string) => {
  switch (language) {
    case 'nl':
      return {
        intro: 'Je schrijft een kalm bedtijdverhaal voor 3–7 jaar. Het verhaal moet knus, zacht en veilig zijn.',
        noCliffhangers: 'Geen cliffhangers en geen “nog één verhaal” haakjes.',
        heroLabel: 'HELD DETAILS',
        memoryLabel: 'GEHEUGEN',
        choicesLabel: 'KEUZES VAN VANAVOND (gekozen in drie niveaus)',
        rulesLabel: 'HARDEREGELS',
        rules: [
          '500–800 woorden',
          'rustige pacing met knusse beelden',
          'geen schurken, gevaar, angst, geschreeuw, urgentie of plotselinge verrassingen',
          'geen cliffhangers of “nog één verhaal” haakjes',
          'eindig met de held die veilig in slaap valt',
          'personalisatie alleen op basis van held, geheugen, tags en keuzes van vanavond',
        ],
        outputLabel: 'OUTPUTFORMAAT (ALLEEN JSON)',
      };
    case 'sv':
      return {
        intro: 'Du skriver en lugn godnattsberättelse för 3–7 år. Berättelsen ska vara ombonad, mjuk och trygg.',
        noCliffhangers: 'Inga cliffhangers och inga “en berättelse till” krokar.',
        heroLabel: 'HJÄLTEUPPGIFTER',
        memoryLabel: 'MINNE',
        choicesLabel: 'KVÄLLENS VAL (valda i tre nivåer)',
        rulesLabel: 'HÅRDA REGLER',
        rules: [
          '500–800 ord',
          'lugn rytm med ombonade bilder',
          'inga skurkar, fara, rädsla, skrik, brådska eller plötsliga överraskningar',
          'inga cliffhangers eller “en berättelse till” krokar',
          'avsluta med att hjälten somnar tryggt',
          'personalisering endast från hjälte, minne, taggar och kvällens val',
        ],
        outputLabel: 'UTDATAFORMAT (ENDAST JSON)',
      };
    default:
      return {
        intro: 'You are writing a calming bedtime story for ages 3–7. The story must be cozy, gentle, and safe.',
        noCliffhangers: 'No cliffhangers and no "one more story" hooks.',
        heroLabel: 'HERO DETAILS',
        memoryLabel: 'MEMORY',
        choicesLabel: "TONIGHT'S CHOICES (selected in three levels)",
        rulesLabel: 'HARD RULES',
        rules: [
          '500–800 words',
          'calm pacing with cozy imagery',
          'no villains, danger, fear, shouting, urgency, or sudden surprises',
          'no cliffhangers or "one more story" hooks',
          'end with the hero falling asleep safely',
          "personalization only from hero details, memory, tags, and tonight's choices",
        ],
        outputLabel: 'OUTPUT FORMAT (JSON ONLY)',
      };
  }
};

export const buildStoryBrief = ({ hero, lastSummary, topTags, selections, language }: StoryBriefInput) => {
  const tagsLine = topTags.length > 0 ? topTags.join(', ') : 'None yet';
  const copy = copyForLanguage(language);

  return `
${copy.intro}
${copy.noCliffhangers}

${copy.heroLabel}
- Name: ${hero.heroName}
- Type: ${hero.heroType}
- Trait: ${hero.heroTrait}
- Comfort item: ${hero.comfortItem}

${copy.memoryLabel}
- Last episode summary: ${lastSummary}
- Top preference tags: ${tagsLine}

${copy.choicesLabel}
1) ${selections.level1}
2) ${selections.level2}
3) ${selections.level3}

${copy.rulesLabel}
${copy.rules.map((rule) => `- ${rule}`).join('\n')}

${copy.outputLabel}
{
  "title": "...",
  "story": "...",
  "summary": "...",
  "tags_used": ["cozy","forest","gentle_helping"],
  "reading_time_minutes": 4
}
  `.trim();
};
