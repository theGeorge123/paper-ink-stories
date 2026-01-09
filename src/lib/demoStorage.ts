import { trackDemoEvent } from '@/lib/performance';

const DEMO_COOKIE_NAME = 'pi_demo_id';
const DEMO_COOKIE_DAYS = 7;
const DEMO_STORAGE_PREFIX = 'paper-ink-demo';

export interface DemoHeroInput {
  heroName: string;
  heroType: string;
  heroTrait: string;
  comfortItem: string;
  ageBand: string;
  sidekickName?: string | null;
  sidekickArchetype?: string | null;
}

export type DemoAnswers = {
  level1: string;
  level2: string;
  level3: string;
};

export type DemoStoryContext = {
  lastSummary: string;
  topTags: string[];
  storiesUsed: number;
};

export type DemoStoryRecord = {
  storyTitle: string;
  storyText: string;
  episodeSummary: string;
  choices: DemoAnswers;
  tagsUsed: string[];
  readingTimeMinutes: number;
  createdAt: string;
};

interface DemoCookieSchema {
  demoId: string;
  createdAt: string;
  hero?: DemoHeroInput | null;
  answers?: DemoAnswers | null;
  lastSummary?: string | null;
  tagCounts?: Record<string, number> | null;
  storiesUsed?: number | null;
}

const DEMO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isValidDemoId = (value: string): boolean => DEMO_ID_PATTERN.test(value) || value.startsWith('demo-');

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
};

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const storageKey = (demoId: string, suffix: string) => `${DEMO_STORAGE_PREFIX}:${demoId}:${suffix}`;
const heroStorageKey = (demoId: string) => storageKey(demoId, 'hero');
const answersStorageKey = (demoId: string) => storageKey(demoId, 'answers');

const writeCookie = (name: string, value: string, days: number): void => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const clearCookie = (name: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
};

const createDemoId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseDemoCookie = (rawValue: string): DemoCookieSchema | null => {
  if (isValidDemoId(rawValue)) {
    return { demoId: rawValue, createdAt: new Date().toISOString() };
  }

  try {
    const parsed = JSON.parse(rawValue) as DemoCookieSchema;
    if (parsed && isValidDemoId(parsed.demoId)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};

const serializeDemoCookie = (payload: DemoCookieSchema): string => JSON.stringify(payload);

const readDemoSession = (): DemoCookieSchema | null => {
  const rawValue = readCookie(DEMO_COOKIE_NAME);
  if (!rawValue) return null;
  return parseDemoCookie(rawValue);
};

const ensureDemoSession = (): DemoCookieSchema => {
  const existing = readDemoSession();
  if (existing) return existing;
  const session = { demoId: createDemoId(), createdAt: new Date().toISOString() };
  writeCookie(DEMO_COOKIE_NAME, serializeDemoCookie(session), DEMO_COOKIE_DAYS);
  return session;
};

const writeDemoSession = (payload: DemoCookieSchema): void => {
  writeCookie(DEMO_COOKIE_NAME, serializeDemoCookie(payload), DEMO_COOKIE_DAYS);
};

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const readDemoStory = (demoId: string): DemoStoryRecord | null => {
  const storage = getStorage();
  if (!storage) return null;
  return safeParse<DemoStoryRecord | null>(storage.getItem(storageKey(demoId, 'story')), null);
};

const readDemoHeroFromStorage = (demoId: string): DemoHeroInput | null => {
  const storage = getStorage();
  if (!storage) return null;
  return safeParse<DemoHeroInput | null>(storage.getItem(heroStorageKey(demoId)), null);
};

const writeDemoHeroToStorage = (demoId: string, hero: DemoHeroInput | null): void => {
  const storage = getStorage();
  if (!storage) return;
  const key = heroStorageKey(demoId);
  if (!hero) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(hero));
};

const readDemoAnswersFromStorage = (demoId: string): DemoAnswers | null => {
  const storage = getStorage();
  if (!storage) return null;
  return safeParse<DemoAnswers | null>(storage.getItem(answersStorageKey(demoId)), null);
};

const writeDemoAnswersToStorage = (demoId: string, answers: DemoAnswers | null): void => {
  const storage = getStorage();
  if (!storage) return;
  const key = answersStorageKey(demoId);
  if (!answers) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(answers));
};

const writeDemoStory = (demoId: string, story: DemoStoryRecord | null): void => {
  const storage = getStorage();
  if (!storage) return;
  const key = storageKey(demoId, 'story');
  if (!story) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(story));
};

const getTopTagsFromCounts = (counts?: Record<string, number> | null, limit = 5): string[] => {
  if (!counts) return [];
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag]) => tag);
};

/**
 * Fetch the demo id from cookies or create a new one.
 */
export const getOrCreateDemoId = (): string => {
  try {
    const session = ensureDemoSession();
    return session.demoId;
  } catch (error) {
    console.error('[demoStorage] Failed to ensure demo session:', error);
    return createDemoId();
  }
};

export const getDemoIdFromCookie = (): string | null => {
  try {
    const session = readDemoSession();
    return session?.demoId ?? null;
  } catch (error) {
    console.error('[demoStorage] Failed to read demo cookie:', error);
    return null;
  }
};

export const buildDemoRoute = (path: string): string => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}t=${Date.now()}`;
};

/**
 * Clear the demo id cookie.
 */
export const clearDemoId = (): void => {
  const session = readDemoSession();
  if (session?.demoId) {
    writeDemoStory(session.demoId, null);
    writeDemoHeroToStorage(session.demoId, null);
    writeDemoAnswersToStorage(session.demoId, null);
  }
  clearCookie(DEMO_COOKIE_NAME);
};

export const getDemoHero = (): DemoHeroInput | null => {
  const session = readDemoSession();
  if (!session?.demoId) return null;
  return session.hero ?? readDemoHeroFromStorage(session.demoId);
};

export const saveDemoHero = (hero: DemoHeroInput): void => {
  const session = ensureDemoSession();
  const payload: DemoCookieSchema = {
    ...session,
    hero,
    answers: null,
    lastSummary: null,
    tagCounts: null,
    storiesUsed: 0,
  };
  writeDemoSession(payload);
  writeDemoStory(payload.demoId, null);
  writeDemoHeroToStorage(payload.demoId, hero);
  writeDemoAnswersToStorage(payload.demoId, null);
  trackDemoEvent('demo_save_hero_success', { demoId: payload.demoId });
};

export const getDemoAnswers = (): DemoAnswers | null => {
  const session = readDemoSession();
  if (!session?.demoId) return null;
  return session.answers ?? readDemoAnswersFromStorage(session.demoId);
};

export const saveDemoAnswers = (answers: DemoAnswers): void => {
  const session = ensureDemoSession();
  const payload: DemoCookieSchema = {
    ...session,
    answers,
  };
  writeDemoSession(payload);
  if (session.demoId) {
    writeDemoAnswersToStorage(session.demoId, answers);
  }
};

export const getDemoStory = (): DemoStoryRecord | null => {
  const session = readDemoSession();
  if (!session?.demoId) return null;
  return readDemoStory(session.demoId);
};

export const saveDemoStory = (story: DemoStoryRecord): void => {
  const session = ensureDemoSession();
  writeDemoStory(session.demoId, story);
};

export const getDemoStoryContext = (): DemoStoryContext => {
  const session = readDemoSession();
  return {
    lastSummary: session?.lastSummary || 'None (first episode).',
    topTags: getTopTagsFromCounts(session?.tagCounts, 5),
    storiesUsed: session?.storiesUsed ?? 0,
  };
};

export const saveDemoStoryMemory = (summary: string, tagsUsed: string[]): void => {
  const session = ensureDemoSession();
  const nextCounts: Record<string, number> = { ...(session.tagCounts ?? {}) };
  tagsUsed.forEach((tag) => {
    nextCounts[tag] = (nextCounts[tag] ?? 0) + 1;
  });

  const payload: DemoCookieSchema = {
    ...session,
    lastSummary: summary,
    tagCounts: nextCounts,
    storiesUsed: (session.storiesUsed ?? 0) + 1,
  };

  writeDemoSession(payload);
};
