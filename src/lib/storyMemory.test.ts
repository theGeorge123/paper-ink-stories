import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadProfileId,
  getHero,
  saveHero,
  getEpisodes,
  getLastEpisode,
  saveEpisode,
  getLastEpisodeId,
  getEpisodeById,
  getTopPreferenceTags,
  applyTags,
  createEpisodeId,
  type HeroProfile,
  type EpisodeRecord,
} from './storyMemory';

describe('storyMemory', () => {
  let mockStorage: Map<string, string>;
  let mockLocalStorage: Storage;

  beforeEach(() => {
    // Reset localStorage mock before each test
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

  describe('loadProfileId', () => {
    it('should create a new profile ID if none exists', () => {
      const profileId = loadProfileId();
      expect(profileId).toBeTruthy();
      expect(typeof profileId).toBe('string');
    });

    it('should persist profile ID to localStorage', () => {
      const profileId = loadProfileId();
      const stored = mockStorage.get('paper-ink-stories:profile-id');
      expect(stored).toBe(profileId);
    });

    it('should return existing profile ID if one exists', () => {
      mockStorage.set('paper-ink-stories:profile-id', 'existing-profile-123');
      const profileId = loadProfileId();
      expect(profileId).toBe('existing-profile-123');
    });

    it('should set storage version on first run', () => {
      loadProfileId();
      const version = mockStorage.get('paper-ink-stories:profile-version');
      expect(version).toBe('1');
    });

    it('should not overwrite existing storage version', () => {
      mockStorage.set('paper-ink-stories:profile-version', '1');
      loadProfileId();
      const version = mockStorage.get('paper-ink-stories:profile-version');
      expect(version).toBe('1');
    });
  });

  describe('Hero Management', () => {
    const testProfileId = 'test-profile-123';
    const testHero: HeroProfile = {
      heroName: 'Leo',
      heroType: 'Brave Knight',
      heroTrait: 'Courageous',
      comfortItem: 'Lucky Sword',
      supabaseCharacterId: 'char-456',
    };

    describe('saveHero', () => {
      it('should save hero to localStorage', () => {
        saveHero(testProfileId, testHero);
        const stored = mockStorage.get('paper-ink-stories:test-profile-123:hero');
        expect(stored).toBeTruthy();
        expect(JSON.parse(stored!)).toEqual(testHero);
      });

      it('should overwrite existing hero', () => {
        const hero1: HeroProfile = { ...testHero, heroName: 'Hero1' };
        const hero2: HeroProfile = { ...testHero, heroName: 'Hero2' };

        saveHero(testProfileId, hero1);
        saveHero(testProfileId, hero2);

        const stored = getHero(testProfileId);
        expect(stored?.heroName).toBe('Hero2');
      });
    });

    describe('getHero', () => {
      it('should return null if no hero exists', () => {
        const hero = getHero(testProfileId);
        expect(hero).toBeNull();
      });

      it('should return saved hero', () => {
        saveHero(testProfileId, testHero);
        const hero = getHero(testProfileId);
        expect(hero).toEqual(testHero);
      });

      it('should normalize hero with missing fields', () => {
        const partialHero = {
          heroName: 'Leo',
          heroType: 'Knight',
        };
        mockStorage.set(
          'paper-ink-stories:test-profile-123:hero',
          JSON.stringify(partialHero)
        );

        const hero = getHero(testProfileId);
        expect(hero).toEqual({
          heroName: 'Leo',
          heroType: 'Knight',
          heroTrait: '',
          comfortItem: '',
          supabaseCharacterId: null,
        });
      });

      it('should return null for corrupted data', () => {
        mockStorage.set('paper-ink-stories:test-profile-123:hero', 'invalid-json{');
        const hero = getHero(testProfileId);
        expect(hero).toBeNull();
      });
    });
  });

  describe('Episode Management', () => {
    const testProfileId = 'test-profile-123';
    const testEpisode: EpisodeRecord = {
      id: 'episode-1',
      episodeNumber: 1,
      storyTitle: 'The Beginning',
      storyText: 'Once upon a time...',
      episodeSummary: 'Hero starts journey',
      choices: {
        level1: 'Forest',
        level2: 'Brave',
        level3: 'Sword',
      },
      tagsUsed: ['adventure', 'forest'],
      readingTimeMinutes: 5,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    describe('saveEpisode', () => {
      it('should save a new episode', () => {
        saveEpisode(testProfileId, testEpisode);
        const episodes = getEpisodes(testProfileId);
        expect(episodes).toHaveLength(1);
        expect(episodes[0]).toEqual(testEpisode);
      });

      it('should update existing episode by ID', () => {
        const episode1 = { ...testEpisode, storyTitle: 'Title 1' };
        const episode2 = { ...testEpisode, storyTitle: 'Title 2' };

        saveEpisode(testProfileId, episode1);
        saveEpisode(testProfileId, episode2);

        const episodes = getEpisodes(testProfileId);
        expect(episodes).toHaveLength(1);
        expect(episodes[0]?.storyTitle).toBe('Title 2');
      });

      it('should save multiple episodes', () => {
        const ep1 = { ...testEpisode, id: 'ep-1', episodeNumber: 1 };
        const ep2 = { ...testEpisode, id: 'ep-2', episodeNumber: 2 };
        const ep3 = { ...testEpisode, id: 'ep-3', episodeNumber: 3 };

        saveEpisode(testProfileId, ep1);
        saveEpisode(testProfileId, ep2);
        saveEpisode(testProfileId, ep3);

        const episodes = getEpisodes(testProfileId);
        expect(episodes).toHaveLength(3);
      });

      it('should sort episodes by episode number', () => {
        const ep3 = { ...testEpisode, id: 'ep-3', episodeNumber: 3 };
        const ep1 = { ...testEpisode, id: 'ep-1', episodeNumber: 1 };
        const ep2 = { ...testEpisode, id: 'ep-2', episodeNumber: 2 };

        // Save in random order
        saveEpisode(testProfileId, ep3);
        saveEpisode(testProfileId, ep1);
        saveEpisode(testProfileId, ep2);

        const episodes = getEpisodes(testProfileId);
        expect(episodes[0]?.episodeNumber).toBe(1);
        expect(episodes[1]?.episodeNumber).toBe(2);
        expect(episodes[2]?.episodeNumber).toBe(3);
      });

      it('should save last episode ID', () => {
        saveEpisode(testProfileId, testEpisode);
        const lastId = getLastEpisodeId(testProfileId);
        expect(lastId).toBe('episode-1');
      });
    });

    describe('getEpisodes', () => {
      it('should return empty array if no episodes exist', () => {
        const episodes = getEpisodes(testProfileId);
        expect(episodes).toEqual([]);
      });

      it('should return all saved episodes', () => {
        const ep1 = { ...testEpisode, id: 'ep-1', episodeNumber: 1 };
        const ep2 = { ...testEpisode, id: 'ep-2', episodeNumber: 2 };

        saveEpisode(testProfileId, ep1);
        saveEpisode(testProfileId, ep2);

        const episodes = getEpisodes(testProfileId);
        expect(episodes).toHaveLength(2);
      });

      it('should normalize episodes with missing fields', () => {
        const partialEpisode = {
          id: 'ep-1',
          episodeNumber: 1,
        };
        mockStorage.set(
          'paper-ink-stories:test-profile-123:episodes',
          JSON.stringify([partialEpisode])
        );

        const episodes = getEpisodes(testProfileId);
        expect(episodes[0]).toMatchObject({
          id: 'ep-1',
          episodeNumber: 1,
          storyTitle: '',
          storyText: '',
          episodeSummary: '',
          tagsUsed: [],
          readingTimeMinutes: 1,
        });
      });

      it('should handle corrupted data gracefully', () => {
        mockStorage.set('paper-ink-stories:test-profile-123:episodes', 'invalid-json{');
        const episodes = getEpisodes(testProfileId);
        expect(episodes).toEqual([]);
      });
    });

    describe('getLastEpisode', () => {
      it('should return null if no episodes exist', () => {
        const last = getLastEpisode(testProfileId);
        expect(last).toBeNull();
      });

      it('should return the episode with highest episode number', () => {
        const ep1 = { ...testEpisode, id: 'ep-1', episodeNumber: 1 };
        const ep2 = { ...testEpisode, id: 'ep-2', episodeNumber: 2 };
        const ep3 = { ...testEpisode, id: 'ep-3', episodeNumber: 3 };

        saveEpisode(testProfileId, ep1);
        saveEpisode(testProfileId, ep2);
        saveEpisode(testProfileId, ep3);

        const last = getLastEpisode(testProfileId);
        expect(last?.episodeNumber).toBe(3);
        expect(last?.id).toBe('ep-3');
      });

      it('should work even if episodes are saved out of order', () => {
        const ep3 = { ...testEpisode, id: 'ep-3', episodeNumber: 3 };
        const ep1 = { ...testEpisode, id: 'ep-1', episodeNumber: 1 };

        saveEpisode(testProfileId, ep3);
        saveEpisode(testProfileId, ep1);

        const last = getLastEpisode(testProfileId);
        expect(last?.episodeNumber).toBe(3);
      });
    });

    describe('getEpisodeById', () => {
      it('should return null if episode not found', () => {
        const episode = getEpisodeById(testProfileId, 'non-existent');
        expect(episode).toBeNull();
      });

      it('should return the correct episode by ID', () => {
        const ep1 = { ...testEpisode, id: 'ep-1', episodeNumber: 1 };
        const ep2 = { ...testEpisode, id: 'ep-2', episodeNumber: 2 };

        saveEpisode(testProfileId, ep1);
        saveEpisode(testProfileId, ep2);

        const episode = getEpisodeById(testProfileId, 'ep-2');
        expect(episode?.id).toBe('ep-2');
        expect(episode?.episodeNumber).toBe(2);
      });
    });

    describe('getLastEpisodeId', () => {
      it('should return null if no last episode ID saved', () => {
        const lastId = getLastEpisodeId(testProfileId);
        expect(lastId).toBeNull();
      });

      it('should return the last saved episode ID', () => {
        saveEpisode(testProfileId, testEpisode);
        const lastId = getLastEpisodeId(testProfileId);
        expect(lastId).toBe('episode-1');
      });
    });
  });

  describe('Preference Management', () => {
    const testProfileId = 'test-profile-123';

    describe('applyTags', () => {
      it('should initialize tag scores', () => {
        applyTags(testProfileId, ['adventure', 'forest']);
        const tags = getTopPreferenceTags(testProfileId);
        expect(tags).toContain('adventure');
        expect(tags).toContain('forest');
      });

      it('should increment existing tag scores', () => {
        applyTags(testProfileId, ['adventure']);
        applyTags(testProfileId, ['adventure']);
        applyTags(testProfileId, ['forest']);

        const tags = getTopPreferenceTags(testProfileId);
        // adventure should be first (score: 2), forest second (score: 1)
        expect(tags[0]).toBe('adventure');
        expect(tags[1]).toBe('forest');
      });

      it('should handle multiple tags at once', () => {
        applyTags(testProfileId, ['adventure', 'forest', 'magic']);
        const tags = getTopPreferenceTags(testProfileId);
        expect(tags).toHaveLength(3);
      });

      it('should not do anything with empty tags array', () => {
        applyTags(testProfileId, []);
        const tags = getTopPreferenceTags(testProfileId);
        expect(tags).toEqual([]);
      });

      it('should accumulate scores across multiple calls', () => {
        applyTags(testProfileId, ['adventure', 'magic']);
        applyTags(testProfileId, ['adventure', 'forest']);
        applyTags(testProfileId, ['magic', 'forest']);

        const tags = getTopPreferenceTags(testProfileId, 10);
        // adventure: 2, magic: 2, forest: 2 (or any order with same scores)
        expect(tags).toContain('adventure');
        expect(tags).toContain('magic');
        expect(tags).toContain('forest');
        expect(tags).toHaveLength(3);
      });
    });

    describe('getTopPreferenceTags', () => {
      it('should return empty array if no preferences exist', () => {
        const tags = getTopPreferenceTags(testProfileId);
        expect(tags).toEqual([]);
      });

      it('should return top tags sorted by score', () => {
        applyTags(testProfileId, ['adventure']);
        applyTags(testProfileId, ['adventure']);
        applyTags(testProfileId, ['adventure']);
        applyTags(testProfileId, ['forest']);
        applyTags(testProfileId, ['forest']);
        applyTags(testProfileId, ['magic']);

        const tags = getTopPreferenceTags(testProfileId);
        expect(tags[0]).toBe('adventure'); // score: 3
        expect(tags[1]).toBe('forest');    // score: 2
        expect(tags[2]).toBe('magic');     // score: 1
      });

      it('should respect the limit parameter', () => {
        applyTags(testProfileId, ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7']);
        const tags = getTopPreferenceTags(testProfileId, 3);
        expect(tags).toHaveLength(3);
      });

      it('should default to limit of 5', () => {
        applyTags(testProfileId, ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8']);
        const tags = getTopPreferenceTags(testProfileId);
        expect(tags).toHaveLength(5);
      });

      it('should handle corrupted preference data', () => {
        mockStorage.set('paper-ink-stories:test-profile-123:preferences', 'invalid-json{');
        const tags = getTopPreferenceTags(testProfileId);
        expect(tags).toEqual([]);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('createEpisodeId', () => {
      it('should create a unique ID', () => {
        const id1 = createEpisodeId();
        const id2 = createEpisodeId();
        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id1).not.toBe(id2);
      });

      it('should return a string', () => {
        const id = createEpisodeId();
        expect(typeof id).toBe('string');
      });
    });
  });

  describe('Integration Tests', () => {
    const testProfileId = 'test-profile-integration';

    it('should handle complete user journey: create hero, save episodes, track preferences', () => {
      // 1. Create a hero
      const hero: HeroProfile = {
        heroName: 'Leo',
        heroType: 'Knight',
        heroTrait: 'Brave',
        comfortItem: 'Sword',
      };
      saveHero(testProfileId, hero);

      // 2. Save first episode
      const ep1: EpisodeRecord = {
        id: createEpisodeId(),
        episodeNumber: 1,
        storyTitle: 'The Beginning',
        storyText: 'Story text...',
        episodeSummary: 'Summary...',
        choices: { level1: 'Forest', level2: 'Brave', level3: 'Sword' },
        tagsUsed: ['adventure', 'forest'],
        readingTimeMinutes: 5,
        createdAt: new Date().toISOString(),
      };
      saveEpisode(testProfileId, ep1);
      applyTags(testProfileId, ep1.tagsUsed);

      // 3. Save second episode
      const ep2: EpisodeRecord = {
        id: createEpisodeId(),
        episodeNumber: 2,
        storyTitle: 'The Journey',
        storyText: 'Story text...',
        episodeSummary: 'Summary...',
        choices: { level1: 'Mountain', level2: 'Clever', level3: 'Map' },
        tagsUsed: ['adventure', 'mountain'],
        readingTimeMinutes: 6,
        createdAt: new Date().toISOString(),
      };
      saveEpisode(testProfileId, ep2);
      applyTags(testProfileId, ep2.tagsUsed);

      // Verify hero
      const savedHero = getHero(testProfileId);
      expect(savedHero?.heroName).toBe('Leo');

      // Verify episodes
      const episodes = getEpisodes(testProfileId);
      expect(episodes).toHaveLength(2);

      // Verify last episode
      const lastEpisode = getLastEpisode(testProfileId);
      expect(lastEpisode?.episodeNumber).toBe(2);

      // Verify preferences (adventure should be top with score 2)
      const topTags = getTopPreferenceTags(testProfileId);
      expect(topTags[0]).toBe('adventure');
    });
  });
});
