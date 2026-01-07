import { supabase } from '@/integrations/supabase/client';

const DEMO_COOKIE_NAME = 'pi_demo_id';
const DEMO_COOKIE_DAYS = 90;

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

const isValidDemoId = (value: string) => DEMO_ID_PATTERN.test(value) || value.startsWith('demo-');

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

export const getOrCreateDemoId = (): string => {
  const existing = readCookie(DEMO_COOKIE_NAME);
  if (existing) {
    const parsed = parseDemoCookie(existing);
    if (parsed) return parsed.demoId;
    clearCookie(DEMO_COOKIE_NAME);
  }
  const demoId = createDemoId();
  writeCookie(DEMO_COOKIE_NAME, serializeDemoCookie(demoId), DEMO_COOKIE_DAYS);
  return demoId;
};

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

export const saveDemoHero = async (demoId: string, hero: DemoHeroInput): Promise<void> => {
  const { error } = await supabase.functions.invoke('demo-save-hero', {
    body: { demoId, hero },
  });

  if (error) {
    throw error;
  }
};
