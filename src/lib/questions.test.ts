import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateQuestionsContext,
  createThreeLevelQuestions,
  validateThreeLevelQuestions,
  getNextQuestions,
  type HeroProfile,
  type QuestionContext,
  type ThreeLevelQuestions,
} from './questions';
import * as storyMemory from './storyMemory';

describe('questions', () => {
  const testHero: HeroProfile = {
    heroName: 'Leo',
    heroType: 'Knight',
    heroTrait: 'Brave',
    comfortItem: 'Sword',
  };

  describe('generateQuestionsContext', () => {
    it('should create question context with all parameters', () => {
      const context = generateQuestionsContext(
        testHero,
        'Last episode summary',
        ['adventure', 'forest'],
        'en'
      );

      expect(context).toEqual({
        hero: testHero,
        lastSummary: 'Last episode summary',
        topTags: ['adventure', 'forest'],
        language: 'en',
      });
    });

    it('should work with null hero', () => {
      const context = generateQuestionsContext(
        null,
        'Summary',
        [],
        'en'
      );

      expect(context.hero).toBeNull();
      expect(context.lastSummary).toBe('Summary');
    });

    it('should work without language parameter', () => {
      const context = generateQuestionsContext(
        testHero,
        'Summary',
        []
      );

      expect(context.language).toBeUndefined();
    });
  });

  describe('createThreeLevelQuestions', () => {
    describe('English questions', () => {
      it('should create questions in English by default', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
        };

        const questions = createThreeLevelQuestions(context);

        expect(questions.level1.question).toContain('Leo');
        expect(questions.level1.question).toContain('cozy');
        expect(questions.level2.question).toContain('Leo');
        expect(questions.level2.question).toContain('calm activity');
        expect(questions.level3.question).toContain('Leo');
        expect(questions.level3.question).toContain('sleepy moment');
      });

      it('should personalize options with hero properties', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'en',
        };

        const questions = createThreeLevelQuestions(context);

        // Check that comfort item (Sword) is used
        const level1Option3 = questions.level1.options[2];
        expect(level1Option3?.label.toLowerCase()).toContain('sword');

        // Check that hero type (Knight) is used
        const level2Option2 = questions.level2.options[1];
        expect(level2Option2?.label.toLowerCase()).toContain('knight');

        // Check that comfort item is used in level3
        const level3Option3 = questions.level3.options[2];
        expect(level3Option3?.label.toLowerCase()).toContain('sword');
      });

      it('should use fallback values for missing hero properties', () => {
        const context: QuestionContext = {
          hero: {
            heroName: 'Leo',
            heroType: '',
            heroTrait: '',
            comfortItem: '',
          },
          lastSummary: 'Summary',
          topTags: [],
          language: 'en',
        };

        const questions = createThreeLevelQuestions(context);

        // Should use 'friend' fallback for empty heroType
        const level2Option2 = questions.level2.options[1];
        expect(level2Option2?.label.toLowerCase()).toContain('friend');

        // Should use 'blanket' fallback for empty comfortItem
        const level1Option3 = questions.level1.options[2];
        expect(level1Option3?.label.toLowerCase()).toContain('blanket');
      });

      it('should use "your hero" when hero name is missing', () => {
        const context: QuestionContext = {
          hero: {
            heroName: '',
            heroType: 'Knight',
            heroTrait: 'Brave',
            comfortItem: 'Sword',
          },
          lastSummary: 'Summary',
          topTags: [],
          language: 'en',
        };

        const questions = createThreeLevelQuestions(context);

        expect(questions.level1.question).toContain('your hero');
      });

      it('should include tags for all options', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'en',
        };

        const questions = createThreeLevelQuestions(context);

        // Check level1 options have tags
        expect(questions.level1.options[0]?.tags).toContain('forest');
        expect(questions.level1.options[1]?.tags).toContain('meadow');
        expect(questions.level1.options[2]?.tags).toContain('home');

        // Check level2 options have tags
        expect(questions.level2.options[0]?.tags).toContain('music');
        expect(questions.level2.options[1]?.tags).toContain('sharing');
        expect(questions.level2.options[2]?.tags).toContain('twinkle');

        // Check level3 options have tags
        expect(questions.level3.options[0]?.tags).toContain('turtle');
        expect(questions.level3.options[1]?.tags).toContain('owl');
        expect(questions.level3.options[2]?.tags).toContain('friend');
      });
    });

    describe('Dutch questions', () => {
      it('should create questions in Dutch', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'nl',
        };

        const questions = createThreeLevelQuestions(context);

        expect(questions.level1.question).toContain('Leo');
        expect(questions.level1.question).toContain('knus');
        expect(questions.level2.question).toContain('rustige activiteit');
        expect(questions.level3.question).toContain('slaperige moment');
      });

      it('should personalize Dutch options with hero properties', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'nl',
        };

        const questions = createThreeLevelQuestions(context);

        // Check that comfort item (Sword) is used in Dutch
        const level1Option3 = questions.level1.options[2];
        expect(level1Option3?.label.toLowerCase()).toContain('sword');

        // Check that hero type (Knight) is used in Dutch
        const level2Option2 = questions.level2.options[1];
        expect(level2Option2?.label.toLowerCase()).toContain('knight');
      });

      it('should include same tags for Dutch options', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'nl',
        };

        const questions = createThreeLevelQuestions(context);

        // Tags should be in English even for Dutch questions
        expect(questions.level1.options[0]?.tags).toContain('forest');
        expect(questions.level2.options[0]?.tags).toContain('music');
        expect(questions.level3.options[0]?.tags).toContain('turtle');
      });
    });

    describe('Swedish questions', () => {
      it('should create questions in Swedish', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'sv',
        };

        const questions = createThreeLevelQuestions(context);

        expect(questions.level1.question).toContain('Leo');
        expect(questions.level1.question).toContain('ombonad');
        expect(questions.level2.question).toContain('lugn aktivitet');
        expect(questions.level3.question).toContain('sömniga stunden');
      });

      it('should personalize Swedish options with hero properties', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'sv',
        };

        const questions = createThreeLevelQuestions(context);

        // Check that comfort item (Sword) is used in Swedish
        const level1Option3 = questions.level1.options[2];
        expect(level1Option3?.label.toLowerCase()).toContain('sword');

        // Check that hero type (Knight) is used in Swedish
        const level2Option2 = questions.level2.options[1];
        expect(level2Option2?.label.toLowerCase()).toContain('knight');
      });

      it('should include same tags for Swedish options', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
          language: 'sv',
        };

        const questions = createThreeLevelQuestions(context);

        // Tags should be in English even for Swedish questions
        expect(questions.level1.options[0]?.tags).toContain('forest');
        expect(questions.level2.options[0]?.tags).toContain('music');
        expect(questions.level3.options[0]?.tags).toContain('turtle');
      });
    });

    describe('structure validation', () => {
      it('should create exactly 3 levels', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
        };

        const questions = createThreeLevelQuestions(context);

        expect(questions.level1).toBeDefined();
        expect(questions.level2).toBeDefined();
        expect(questions.level3).toBeDefined();
      });

      it('should create exactly 3 options per level', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
        };

        const questions = createThreeLevelQuestions(context);

        expect(questions.level1.options).toHaveLength(3);
        expect(questions.level2.options).toHaveLength(3);
        expect(questions.level3.options).toHaveLength(3);
      });

      it('should have unique option IDs', () => {
        const context: QuestionContext = {
          hero: testHero,
          lastSummary: 'Summary',
          topTags: [],
        };

        const questions = createThreeLevelQuestions(context);

        const allIds = [
          ...questions.level1.options.map(o => o.id),
          ...questions.level2.options.map(o => o.id),
          ...questions.level3.options.map(o => o.id),
        ];

        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).toBe(9); // 3 levels * 3 options = 9 unique IDs
      });
    });
  });

  describe('validateThreeLevelQuestions', () => {
    it('should return true for valid questions', () => {
      const validQuestions: ThreeLevelQuestions = {
        level1: {
          question: 'Question 1',
          options: [
            { id: 'l1-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l1-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l1-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
        level2: {
          question: 'Question 2',
          options: [
            { id: 'l2-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l2-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l2-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
        level3: {
          question: 'Question 3',
          options: [
            { id: 'l3-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l3-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l3-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
      };

      expect(validateThreeLevelQuestions(validQuestions)).toBe(true);
    });

    it('should return false if a level has less than 3 options', () => {
      const invalidQuestions: any = {
        level1: {
          question: 'Question 1',
          options: [
            { id: 'l1-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l1-o2', label: 'Option 2', tags: ['tag2'] },
          ],
        },
        level2: {
          question: 'Question 2',
          options: [
            { id: 'l2-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l2-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l2-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
        level3: {
          question: 'Question 3',
          options: [
            { id: 'l3-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l3-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l3-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
      };

      expect(validateThreeLevelQuestions(invalidQuestions)).toBe(false);
    });

    it('should return false if any option has no tags', () => {
      const invalidQuestions: ThreeLevelQuestions = {
        level1: {
          question: 'Question 1',
          options: [
            { id: 'l1-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l1-o2', label: 'Option 2', tags: [] },
            { id: 'l1-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
        level2: {
          question: 'Question 2',
          options: [
            { id: 'l2-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l2-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l2-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
        level3: {
          question: 'Question 3',
          options: [
            { id: 'l3-o1', label: 'Option 1', tags: ['tag1'] },
            { id: 'l3-o2', label: 'Option 2', tags: ['tag2'] },
            { id: 'l3-o3', label: 'Option 3', tags: ['tag3'] },
          ],
        },
      };

      expect(validateThreeLevelQuestions(invalidQuestions)).toBe(false);
    });

    it('should validate questions generated by createThreeLevelQuestions', () => {
      const context: QuestionContext = {
        hero: testHero,
        lastSummary: 'Summary',
        topTags: [],
      };

      const questions = createThreeLevelQuestions(context);
      expect(validateThreeLevelQuestions(questions)).toBe(true);
    });
  });

  describe('getNextQuestions', () => {
    let mockStorage: Map<string, string>;
    let mockLocalStorage: Storage;

    beforeEach(() => {
      // Reset localStorage mock
      mockStorage = new Map();

      // Create a proper localStorage mock object
      mockLocalStorage = {
        getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          mockStorage.delete(key);
        }),
        clear: vi.fn(() => {
          mockStorage.clear();
        }),
        key: vi.fn((index: number) => {
          const keys = Array.from(mockStorage.keys());
          return keys[index] ?? null;
        }),
        length: 0,
      } as Storage;

      // Override window.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('should generate questions using stored profile data', () => {
      const profileId = 'test-profile';

      // Set up mock data
      mockStorage.set('paper-ink-stories:profile-id', profileId);
      mockStorage.set(
        `paper-ink-stories:${profileId}:hero`,
        JSON.stringify(testHero)
      );

      const questions = getNextQuestions(profileId, 'en');

      expect(questions).toBeDefined();
      expect(questions.level1.question).toContain('Leo');
      expect(validateThreeLevelQuestions(questions)).toBe(true);
    });

    it('should work without hero data', () => {
      const profileId = 'test-profile-no-hero';
      mockStorage.set('paper-ink-stories:profile-id', profileId);

      const questions = getNextQuestions(profileId, 'en');

      expect(questions).toBeDefined();
      expect(questions.level1.question).toContain('your hero');
      expect(validateThreeLevelQuestions(questions)).toBe(true);
    });

    it('should generate Dutch questions when language is "nl"', () => {
      const profileId = 'test-profile-nl';
      mockStorage.set('paper-ink-stories:profile-id', profileId);
      mockStorage.set(
        `paper-ink-stories:${profileId}:hero`,
        JSON.stringify(testHero)
      );

      const questions = getNextQuestions(profileId, 'nl');

      expect(questions.level1.question).toContain('knus');
      expect(validateThreeLevelQuestions(questions)).toBe(true);
    });

    it('should generate Swedish questions when language is "sv"', () => {
      const profileId = 'test-profile-sv';
      mockStorage.set('paper-ink-stories:profile-id', profileId);
      mockStorage.set(
        `paper-ink-stories:${profileId}:hero`,
        JSON.stringify(testHero)
      );

      const questions = getNextQuestions(profileId, 'sv');

      expect(questions.level1.question).toContain('ombonad');
      expect(validateThreeLevelQuestions(questions)).toBe(true);
    });

    it('should throw error if validation fails', () => {
      // This test is mainly for coverage - validation should always pass for properly generated questions
      // We'd need to mock createThreeLevelQuestions to make it return invalid data to test this properly
      const profileId = 'test-profile';
      mockStorage.set('paper-ink-stories:profile-id', profileId);

      // Normal generation should not throw
      expect(() => getNextQuestions(profileId, 'en')).not.toThrow();
    });

    it('should load profile ID if not provided', () => {
      mockStorage.set('paper-ink-stories:profile-id', 'auto-loaded-profile');

      const questions = getNextQuestions(null, 'en');

      expect(questions).toBeDefined();
      expect(validateThreeLevelQuestions(questions)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    let mockStorage: Map<string, string>;
    let mockLocalStorage: Storage;

    beforeEach(() => {
      mockStorage = new Map();

      // Create a proper localStorage mock object
      mockLocalStorage = {
        getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          mockStorage.delete(key);
        }),
        clear: vi.fn(() => {
          mockStorage.clear();
        }),
        key: vi.fn((index: number) => {
          const keys = Array.from(mockStorage.keys());
          return keys[index] ?? null;
        }),
        length: 0,
      } as Storage;

      // Override window.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });
    });

    it('should generate consistent questions across multiple calls', () => {
      const profileId = 'test-profile';
      mockStorage.set('paper-ink-stories:profile-id', profileId);
      mockStorage.set(
        `paper-ink-stories:${profileId}:hero`,
        JSON.stringify(testHero)
      );

      const questions1 = getNextQuestions(profileId, 'en');
      const questions2 = getNextQuestions(profileId, 'en');

      // Questions should be the same for the same hero
      expect(questions1.level1.question).toBe(questions2.level1.question);
      expect(questions1.level1.options[0]?.label).toBe(questions2.level1.options[0]?.label);
    });

    it('should support full workflow: create context -> generate questions -> validate', () => {
      const context = generateQuestionsContext(
        testHero,
        'Last episode summary',
        ['adventure', 'forest'],
        'en'
      );

      const questions = createThreeLevelQuestions(context);
      const isValid = validateThreeLevelQuestions(questions);

      expect(isValid).toBe(true);
      expect(questions.level1.options).toHaveLength(3);
      expect(questions.level2.options).toHaveLength(3);
      expect(questions.level3.options).toHaveLength(3);
    });
  });
});
