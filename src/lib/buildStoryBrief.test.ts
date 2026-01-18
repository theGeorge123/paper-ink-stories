import { describe, it, expect } from 'vitest';
import { buildStoryBrief, type StoryBriefInput, type StorySelections } from './buildStoryBrief';
import type { HeroProfile } from './storyMemory';

describe('buildStoryBrief', () => {
  const testHero: HeroProfile = {
    heroName: 'Leo',
    heroType: 'Brave Knight',
    heroTrait: 'Courageous',
    comfortItem: 'Lucky Sword',
  };

  const testSelections: StorySelections = {
    level1: 'A quiet forest glade with soft moss',
    level2: 'Listening to a lullaby carried by the breeze',
    level3: 'A kind turtle who loves soft stories',
  };

  describe('English briefs', () => {
    it('should generate a complete story brief in English', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Leo started their journey in the forest',
        topTags: ['adventure', 'forest', 'cozy'],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('calming bedtime story');
      expect(brief).toContain('cozy, gentle, and safe');
      expect(brief).toContain('No cliffhangers');
    });

    it('should include all hero details in English', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('Name: Leo');
      expect(brief).toContain('Type: Brave Knight');
      expect(brief).toContain('Trait: Courageous');
      expect(brief).toContain('Comfort item: Lucky Sword');
    });

    it('should include memory section with last summary and tags', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Leo explored the enchanted forest',
        topTags: ['adventure', 'forest', 'magic'],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('MEMORY');
      expect(brief).toContain('Last episode summary: Leo explored the enchanted forest');
      expect(brief).toContain('Top preference tags: adventure, forest, magic');
    });

    it('should handle empty tags gracefully', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('Top preference tags: None yet');
    });

    it('should include all three selection levels', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain("TONIGHT'S CHOICES");
      expect(brief).toContain('1) A quiet forest glade with soft moss');
      expect(brief).toContain('2) Listening to a lullaby carried by the breeze');
      expect(brief).toContain('3) A kind turtle who loves soft stories');
    });

    it('should include all hard rules', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('HARD RULES');
      expect(brief).toContain('500–800 words');
      expect(brief).toContain('calm pacing with cozy imagery');
      expect(brief).toContain('no villains, danger, fear');
      expect(brief).toContain('no cliffhangers');
      expect(brief).toContain('end with the hero falling asleep safely');
      expect(brief).toContain("personalization only from hero details");
    });

    it('should include JSON output format example', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('OUTPUT FORMAT (JSON ONLY)');
      expect(brief).toContain('"title"');
      expect(brief).toContain('"story"');
      expect(brief).toContain('"summary"');
      expect(brief).toContain('"tags_used"');
      expect(brief).toContain('"reading_time_minutes"');
    });

    it('should default to English when language is undefined', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('calming bedtime story');
      expect(brief).toContain('HERO DETAILS');
      expect(brief).toContain('MEMORY');
    });
  });

  describe('Dutch briefs', () => {
    it('should generate a complete story brief in Dutch', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Leo begon hun reis in het bos',
        topTags: ['avontuur', 'bos', 'knus'],
        selections: testSelections,
        language: 'nl',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('kalm bedtijdverhaal');
      expect(brief).toContain('knus, zacht en veilig');
      expect(brief).toContain('Geen cliffhangers');
    });

    it('should include Dutch section labels', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'nl',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('HELD DETAILS');
      expect(brief).toContain('GEHEUGEN');
      expect(brief).toContain('KEUZES VAN VANAVOND');
      expect(brief).toContain('HARDEREGELS');
      expect(brief).toContain('OUTPUTFORMAAT (ALLEEN JSON)');
    });

    it('should include Dutch rules', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'nl',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('500–800 woorden');
      expect(brief).toContain('rustige pacing met knusse beelden');
      expect(brief).toContain('geen schurken, gevaar, angst');
      expect(brief).toContain('geen cliffhangers');
      expect(brief).toContain('eindig met de held die veilig in slaap valt');
    });

    it('should still include hero details in original language', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'nl',
      };

      const brief = buildStoryBrief(input);

      // Hero details should still be in English (data, not UI)
      expect(brief).toContain('Name: Leo');
      expect(brief).toContain('Type: Brave Knight');
    });
  });

  describe('Swedish briefs', () => {
    it('should generate a complete story brief in Swedish', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Leo började sin resa i skogen',
        topTags: ['äventyr', 'skog', 'mysig'],
        selections: testSelections,
        language: 'sv',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('lugn godnattsberättelse');
      expect(brief).toContain('ombonad, mjuk och trygg');
      expect(brief).toContain('Inga cliffhangers');
    });

    it('should include Swedish section labels', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'sv',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('HJÄLTEUPPGIFTER');
      expect(brief).toContain('MINNE');
      expect(brief).toContain('KVÄLLENS VAL');
      expect(brief).toContain('HÅRDA REGLER');
      expect(brief).toContain('UTDATAFORMAT (ENDAST JSON)');
    });

    it('should include Swedish rules', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'sv',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('500–800 ord');
      expect(brief).toContain('lugn rytm med ombonade bilder');
      expect(brief).toContain('inga skurkar, fara, rädsla');
      expect(brief).toContain('inga cliffhangers');
      expect(brief).toContain('avsluta med att hjälten somnar tryggt');
    });

    it('should still include hero details in original language', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'sv',
      };

      const brief = buildStoryBrief(input);

      // Hero details should still be in English (data, not UI)
      expect(brief).toContain('Name: Leo');
      expect(brief).toContain('Type: Brave Knight');
    });
  });

  describe('Edge cases', () => {
    it('should handle hero with empty fields', () => {
      const emptyHero: HeroProfile = {
        heroName: '',
        heroType: '',
        heroTrait: '',
        comfortItem: '',
      };

      const input: StoryBriefInput = {
        hero: emptyHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('Name: ');
      expect(brief).toContain('Type: ');
      expect(brief).toContain('Trait: ');
      expect(brief).toContain('Comfort item: ');
    });

    it('should handle empty last summary', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: '',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('Last episode summary: ');
    });

    it('should handle empty selections', () => {
      const emptySelections: StorySelections = {
        level1: '',
        level2: '',
        level3: '',
      };

      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: emptySelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('1) ');
      expect(brief).toContain('2) ');
      expect(brief).toContain('3) ');
    });

    it('should handle single tag', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: ['adventure'],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('Top preference tags: adventure');
    });

    it('should handle many tags', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: ['adventure', 'forest', 'magic', 'cozy', 'gentle', 'stars', 'wonder'],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('Top preference tags: adventure, forest, magic, cozy, gentle, stars, wonder');
    });

    it('should handle special characters in hero name', () => {
      const specialHero: HeroProfile = {
        heroName: "Leo O'Brien",
        heroType: 'Knight & Wizard',
        heroTrait: 'Brave, kind',
        comfortItem: 'Mom\'s locket',
      };

      const input: StoryBriefInput = {
        hero: specialHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain("Name: Leo O'Brien");
      expect(brief).toContain('Type: Knight & Wizard');
      expect(brief).toContain('Trait: Brave, kind');
    });

    it('should handle long text in selections', () => {
      const longSelections: StorySelections = {
        level1: 'A quiet forest glade with soft moss where the moonlight filters through ancient trees and gentle creatures gather to rest',
        level2: 'Listening to a lullaby carried by the breeze while watching fireflies dance in the twilight',
        level3: 'A kind turtle who loves soft stories and shares ancient wisdom while keeping watch through the night',
      };

      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: longSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain(longSelections.level1);
      expect(brief).toContain(longSelections.level2);
      expect(brief).toContain(longSelections.level3);
    });

    it('should handle invalid language code gracefully (fallback to English)', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'fr', // French not supported, should fallback to English
      };

      const brief = buildStoryBrief(input);

      expect(brief).toContain('calming bedtime story');
      expect(brief).toContain('HERO DETAILS');
    });
  });

  describe('Output structure', () => {
    it('should produce non-empty output', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief.length).toBeGreaterThan(0);
    });

    it('should trim whitespace from output', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      expect(brief).toBe(brief.trim());
    });

    it('should contain all major sections in order', () => {
      const input: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: ['adventure'],
        selections: testSelections,
        language: 'en',
      };

      const brief = buildStoryBrief(input);

      const introIndex = brief.indexOf('calming bedtime story');
      const heroIndex = brief.indexOf('HERO DETAILS');
      const memoryIndex = brief.indexOf('MEMORY');
      const choicesIndex = brief.indexOf("TONIGHT'S CHOICES");
      const rulesIndex = brief.indexOf('HARD RULES');
      const outputIndex = brief.indexOf('OUTPUT FORMAT');

      expect(introIndex).toBeLessThan(heroIndex);
      expect(heroIndex).toBeLessThan(memoryIndex);
      expect(memoryIndex).toBeLessThan(choicesIndex);
      expect(choicesIndex).toBeLessThan(rulesIndex);
      expect(rulesIndex).toBeLessThan(outputIndex);
    });
  });

  describe('Integration with different languages', () => {
    it('should produce similar structure for all languages', () => {
      const inputEn: StoryBriefInput = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: ['adventure'],
        selections: testSelections,
        language: 'en',
      };

      const inputNl: StoryBriefInput = {
        ...inputEn,
        language: 'nl',
      };

      const inputSv: StoryBriefInput = {
        ...inputEn,
        language: 'sv',
      };

      const briefEn = buildStoryBrief(inputEn);
      const briefNl = buildStoryBrief(inputNl);
      const briefSv = buildStoryBrief(inputSv);

      // All should have similar length (within reasonable range)
      const lengths = [briefEn.length, briefNl.length, briefSv.length];
      const maxLength = Math.max(...lengths);
      const minLength = Math.min(...lengths);

      expect(maxLength - minLength).toBeLessThan(500); // Should be roughly same length

      // All should contain hero name
      expect(briefEn).toContain('Leo');
      expect(briefNl).toContain('Leo');
      expect(briefSv).toContain('Leo');
    });
  });
});
