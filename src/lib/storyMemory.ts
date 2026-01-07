export type HeroProfile = {
  heroName: string;
  heroType: string;
  heroTrait: string;
  comfortItem: string;
  supabaseCharacterId?: string | null;
};

export type EpisodeChoices = {
  level1: string;
  level2: string;
  level3: string;
};

export type EpisodeRecord = {
  id: string;
  episodeNumber: number;
  storyTitle: string;
  storyText: string;
  episodeSummary: string;
  choices: EpisodeChoices;
  tagsUsed: string[];
  readingTimeMinutes: number;
  createdAt: string;
};

type PreferenceScore = {
  tag: string;
  score: number;
};

const STORAGE_PREFIX = 'paper-ink-stories';
const STORAGE_VERSION = 1;
const PROFILE_ID_KEY = `${STORAGE_PREFIX}:profile-id`;
const PROFILE_VERSION_KEY = `${STORAGE_PREFIX}:profile-version`;

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const storageKey = (profileId: string, suffix: string) => `${STORAGE_PREFIX}:${profileId}:${suffix}`;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const loadProfileId = () => {
  const storage = getStorage();
  if (!storage) return 'local-profile';
  const currentVersion = storage.getItem(PROFILE_VERSION_KEY);
  if (!currentVersion) {
    storage.setItem(PROFILE_VERSION_KEY, String(STORAGE_VERSION));
  }
  const existing = storage.getItem(PROFILE_ID_KEY);
  if (existing) return existing;
  const profileId = createId();
  storage.setItem(PROFILE_ID_KEY, profileId);
  return profileId;
};

const normalizeHero = (hero: HeroProfile | null): HeroProfile | null => {
  if (!hero) return null;
  return {
    heroName: hero.heroName ?? '',
    heroType: hero.heroType ?? '',
    heroTrait: hero.heroTrait ?? '',
    comfortItem: hero.comfortItem ?? '',
    supabaseCharacterId: hero.supabaseCharacterId ?? null,
  };
};

export const getHero = (profileId: string): HeroProfile | null => {
  const storage = getStorage();
  if (!storage) return null;
  const hero = safeParse<HeroProfile | null>(storage.getItem(storageKey(profileId, 'hero')), null);
  return normalizeHero(hero);
};

export const saveHero = (profileId: string, hero: HeroProfile) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(storageKey(profileId, 'hero'), JSON.stringify(hero));
};

const normalizeEpisode = (episode: EpisodeRecord): EpisodeRecord => ({
  id: episode.id,
  episodeNumber: episode.episodeNumber ?? 1,
  storyTitle: episode.storyTitle ?? '',
  storyText: episode.storyText ?? '',
  episodeSummary: episode.episodeSummary ?? '',
  choices: {
    level1: episode.choices?.level1 ?? '',
    level2: episode.choices?.level2 ?? '',
    level3: episode.choices?.level3 ?? '',
  },
  tagsUsed: episode.tagsUsed ?? [],
  readingTimeMinutes: episode.readingTimeMinutes ?? 1,
  createdAt: episode.createdAt ?? new Date().toISOString(),
});

export const getEpisodes = (profileId: string): EpisodeRecord[] => {
  const storage = getStorage();
  if (!storage) return [];
  const episodes = safeParse<EpisodeRecord[]>(storage.getItem(storageKey(profileId, 'episodes')), []);
  return episodes.map((episode) => normalizeEpisode(episode));
};

export const getLastEpisode = (profileId: string): EpisodeRecord | null => {
  const episodes = getEpisodes(profileId);
  if (episodes.length === 0) return null;
  return episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)[episodes.length - 1] ?? null;
};

export const saveEpisode = (profileId: string, episode: EpisodeRecord) => {
  const storage = getStorage();
  if (!storage) return;
  const episodes = getEpisodes(profileId);
  const existingIndex = episodes.findIndex((item) => item.id === episode.id);
  if (existingIndex >= 0) {
    episodes[existingIndex] = episode;
  } else {
    episodes.push(episode);
  }
  episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
  storage.setItem(storageKey(profileId, 'episodes'), JSON.stringify(episodes));
  storage.setItem(storageKey(profileId, 'last-episode-id'), episode.id);
};

export const getLastEpisodeId = (profileId: string) => {
  const storage = getStorage();
  if (!storage) return null;
  return storage.getItem(storageKey(profileId, 'last-episode-id'));
};

export const getEpisodeById = (profileId: string, id: string) => {
  const episodes = getEpisodes(profileId);
  return episodes.find((episode) => episode.id === id) ?? null;
};

export const getTopPreferenceTags = (profileId: string, limit = 5): string[] => {
  const storage = getStorage();
  if (!storage) return [];
  const scores = safeParse<PreferenceScore[]>(storage.getItem(storageKey(profileId, 'preferences')), []);
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.tag);
};

export const applyTags = (profileId: string, tagsUsed: string[]) => {
  const storage = getStorage();
  if (!storage || tagsUsed.length === 0) return;
  const scores = safeParse<PreferenceScore[]>(storage.getItem(storageKey(profileId, 'preferences')), []);
  const scoreMap = new Map(scores.map((entry) => [entry.tag, entry.score]));
  tagsUsed.forEach((tag) => {
    scoreMap.set(tag, (scoreMap.get(tag) ?? 0) + 1);
  });
  const updated = Array.from(scoreMap.entries()).map(([tag, score]) => ({ tag, score }));
  storage.setItem(storageKey(profileId, 'preferences'), JSON.stringify(updated));
};

export const createEpisodeId = () => createId();
