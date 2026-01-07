import { supabase } from '@/integrations/supabase/client';
import { trackDemoEvent } from '@/lib/performance';

const DEMO_COOKIE_NAME = 'pi_demo_id';
const DEMO_COOKIE_DAYS = 90;
const DEMO_SAVE_TIMEOUT_MS = 4000;
const DEMO_SAVE_MAX_RETRIES = 3;
const DEMO_SAVE_INITIAL_BACKOFF_MS = 400;

export interface DemoHeroInput {
  heroName: string;
  heroType: string;
  heroTrait: string;
  comfortItem: string;
  ageBand: string;
  sidekickName?: string | null;
  sidekickArchetype?: string | null;
}

export interface DemoEpisodeRecord {
  id: string;
  episodeNumber: number;
  storyText: string;
  episodeSummary: string;
  choices: Record<string, string>;
  tagsUsed: string[];
  createdAt: string;
}

export interface DemoProfile {
  id: string;
  storiesUsed: number;
}

export interface DemoSession {
  profile: DemoProfile;
  hero: DemoHeroInput | null;
  lastEpisode: DemoEpisodeRecord | null;
  topTags: string[];
}

interface DemoCookieSchema {
  demoId: string;
  createdAt: string;
}

interface DemoHeroRecord {
  hero_name: string;
  hero_type: string;
  hero_trait: string;
  comfort_item: string;
  age_band: string;
  sidekick_name?: string | null;
  sidekick_archetype?: string | null;
}

interface DemoEpisodeRecordResponse {
  id: string;
  episode_number: number;
  story_text: string;
  episode_summary: string;
  choices_json?: Record<string, string> | null;
  tags_used?: string[] | null;
  created_at: string;
}

interface DemoProfileRecord {
  id: string;
  stories_used?: number | null;
}

interface DemoSessionResponse {
  profile?: DemoProfileRecord | null;
  hero?: DemoHeroRecord | null;
  last_episode?: DemoEpisodeRecordResponse | null;
  top_tags?: string[] | null;
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

const serializeDemoCookie = (demoId: string): string => {
  const payload: DemoCookieSchema = { demoId, createdAt: new Date().toISOString() };
  return JSON.stringify(payload);
};

const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

export type DemoSaveHeroErrorCode = 'timeout' | 'network' | 'cors' | 'server' | 'validation' | 'unknown';

export class DemoSaveHeroError extends Error {
  code: DemoSaveHeroErrorCode;
  retryable: boolean;
  details?: string;

  constructor(code: DemoSaveHeroErrorCode, message: string, retryable = false, details?: string) {
    super(message);
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

const normalizeSaveError = (error: unknown): DemoSaveHeroError => {
  if (error instanceof DemoSaveHeroError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new DemoSaveHeroError('timeout', 'Request timed out.', true);
  }

  if (lowerMessage.includes('timeout')) {
    return new DemoSaveHeroError('timeout', 'Request timed out.', true);
  }

  if (lowerMessage.includes('failed to fetch') || lowerMessage.includes('network')) {
    return new DemoSaveHeroError('network', 'Network error while saving.', true);
  }

  if (lowerMessage.includes('cors')) {
    return new DemoSaveHeroError('cors', 'Blocked by CORS policy.', true);
  }

  const status = (error as { status?: number })?.status;
  if (typeof status === 'number' && status >= 500) {
    return new DemoSaveHeroError('server', 'Server error while saving.', true);
  }

  if (lowerMessage.includes('invalid') || lowerMessage.includes('validation')) {
    return new DemoSaveHeroError('validation', message);
  }

  return new DemoSaveHeroError('unknown', message || 'Unknown error');
};

const warnIfCookieMissing = (demoId: string): void => {
  const cookie = readCookie(DEMO_COOKIE_NAME);
  if (!cookie) {
    console.warn('[demoStorage] Demo cookie missing while saving hero.', { demoId });
    return;
  }

  const parsed = parseDemoCookie(cookie);
  if (!parsed) {
    console.warn('[demoStorage] Demo cookie invalid while saving hero.', { demoId, cookie });
  }
};

const invokeDemoSaveHero = async (
  demoId: string,
  hero: DemoHeroInput,
  timeoutMs: number,
): Promise<{ data: unknown; error: unknown; durationMs: number }> => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const timeoutId =
    controller && typeof window !== 'undefined'
      ? window.setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const { data, error } = await supabase.functions.invoke('demo-save-hero', {
      body: { demoId, hero },
      signal: controller?.signal,
    });
    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return { data, error, durationMs: end - start };
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Fetch the demo id from cookies or create a new one.
 */
export const getOrCreateDemoId = (): string => {
  try {
    const existing = readCookie(DEMO_COOKIE_NAME);
    if (existing) {
      const parsed = parseDemoCookie(existing);
      if (parsed) return parsed.demoId;
      clearCookie(DEMO_COOKIE_NAME);
    }
    const demoId = createDemoId();
    writeCookie(DEMO_COOKIE_NAME, serializeDemoCookie(demoId), DEMO_COOKIE_DAYS);
    const verifyCookie = readCookie(DEMO_COOKIE_NAME);
    if (!verifyCookie) {
      console.warn('[demoStorage] Demo cookie failed to persist.');
    }
    return demoId;
  } catch (error) {
    console.error('[demoStorage] Function failed:', error);
    return createDemoId();
  }
};

export const getDemoIdFromCookie = (): string | null => {
  try {
    const existing = readCookie(DEMO_COOKIE_NAME);
    if (!existing) return null;
    const parsed = parseDemoCookie(existing);
    return parsed?.demoId ?? null;
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
  clearCookie(DEMO_COOKIE_NAME);
};

const mapDemoHero = (hero?: DemoHeroRecord | null): DemoHeroInput | null => {
  if (!hero || !hero.hero_name || !hero.hero_type || !hero.hero_trait || !hero.comfort_item || !hero.age_band) {
    return null;
  }

  return {
    heroName: hero.hero_name,
    heroType: hero.hero_type,
    heroTrait: hero.hero_trait,
    comfortItem: hero.comfort_item,
    ageBand: hero.age_band,
    sidekickName: hero.sidekick_name ?? null,
    sidekickArchetype: hero.sidekick_archetype ?? null,
  };
};

const mapDemoEpisode = (episode?: DemoEpisodeRecordResponse | null): DemoEpisodeRecord | null => {
  if (!episode || !episode.id || !episode.story_text || !episode.episode_summary || !episode.created_at) {
    return null;
  }

  return {
    id: episode.id,
    episodeNumber: episode.episode_number,
    storyText: episode.story_text,
    episodeSummary: episode.episode_summary,
    choices: episode.choices_json ?? {},
    tagsUsed: episode.tags_used ?? [],
    createdAt: episode.created_at,
  };
};

/**
 * Fetch the latest demo session data for a demo id.
 */
export const fetchDemoSession = async (demoId: string): Promise<DemoSession> => {
  const { data, error } = await supabase.functions.invoke('demo-session', {
    body: { demoId },
  });

  if (error || !data) {
    throw error || new Error('Failed to load demo session');
  }

  const response = data as DemoSessionResponse;

  return {
    profile: {
      id: response.profile?.id ?? demoId,
      storiesUsed: response.profile?.stories_used ?? 0,
    },
    hero: mapDemoHero(response.hero),
    lastEpisode: mapDemoEpisode(response.last_episode),
    topTags: Array.isArray(response.top_tags) ? response.top_tags : [],
  };
};

/**
 * Fetch the demo hero data for a demo session.
 */
export const getDemoHero = async (demoId: string): Promise<DemoHeroInput | null> => {
  try {
    const session = await fetchDemoSession(demoId);
    return session.hero ?? null;
  } catch (error) {
    console.error('[demoStorage] Function failed:', error);
    return null;
  }
};

/**
 * Save demo hero data for a demo session.
 */
export const saveDemoHero = async (demoId: string, hero: DemoHeroInput): Promise<void> => {
  warnIfCookieMissing(demoId);
  trackDemoEvent('demo_save_hero_started', { demoId });

  let delayMs = DEMO_SAVE_INITIAL_BACKOFF_MS;

  for (let attempt = 1; attempt <= DEMO_SAVE_MAX_RETRIES; attempt += 1) {
    try {
      const { data, error, durationMs } = await invokeDemoSaveHero(demoId, hero, DEMO_SAVE_TIMEOUT_MS);
      const responseData = data as { error?: string | { message?: string } } | null;

      trackDemoEvent('demo_save_hero_response', {
        demoId,
        attempt,
        durationMs,
        success: !error && !responseData?.error,
      });

      if (error) {
        throw error;
      }

      if (responseData?.error) {
        const message = typeof responseData.error === 'string' ? responseData.error : responseData.error?.message;
        throw new DemoSaveHeroError('server', message || 'Failed to save demo hero.');
      }

      trackDemoEvent('demo_save_hero_success', { demoId, attempt, durationMs });
      return;
    } catch (error) {
      const normalizedError = normalizeSaveError(error);
      console.error('[demoStorage] Demo save hero attempt failed', {
        attempt,
        code: normalizedError.code,
        message: normalizedError.message,
      });
      trackDemoEvent('demo_save_hero_failed', {
        demoId,
        attempt,
        code: normalizedError.code,
        message: normalizedError.message,
      });

      if (attempt < DEMO_SAVE_MAX_RETRIES && normalizedError.retryable) {
        await sleep(delayMs);
        delayMs *= 2;
        continue;
      }
      throw normalizedError;
    }
  }
};
