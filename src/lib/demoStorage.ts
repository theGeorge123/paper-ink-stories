import { supabase } from '@/integrations/supabase/client';

const DEMO_COOKIE_NAME = 'pi_demo_id';
const DEMO_COOKIE_DAYS = 90;

export type DemoHeroInput = {
  heroName: string;
  heroType: string;
  heroTrait: string;
  comfortItem: string;
  ageBand: string;
  sidekickName?: string | null;
  sidekickArchetype?: string | null;
};

export type DemoEpisodeRecord = {
  id: string;
  episodeNumber: number;
  storyText: string;
  episodeSummary: string;
  choices: Record<string, string>;
  tagsUsed: string[];
  createdAt: string;
};

export type DemoProfile = {
  id: string;
  storiesUsed: number;
};

export type DemoSession = {
  profile: DemoProfile;
  hero: DemoHeroInput | null;
  lastEpisode: DemoEpisodeRecord | null;
  topTags: string[];
};

const readCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
};

const writeCookie = (name: string, value: string, days: number) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const createDemoId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getOrCreateDemoId = () => {
  const existing = readCookie(DEMO_COOKIE_NAME);
  if (existing) return existing;
  const demoId = createDemoId();
  writeCookie(DEMO_COOKIE_NAME, demoId, DEMO_COOKIE_DAYS);
  return demoId;
};

export const fetchDemoSession = async (demoId: string): Promise<DemoSession> => {
  const { data, error } = await supabase.functions.invoke('demo-session', {
    body: { demoId },
  });

  if (error || !data) {
    throw error || new Error('Failed to load demo session');
  }

  return {
    profile: {
      id: data.profile.id,
      storiesUsed: data.profile.stories_used ?? 0,
    },
    hero: data.hero
      ? {
          heroName: data.hero.hero_name,
          heroType: data.hero.hero_type,
          heroTrait: data.hero.hero_trait,
          comfortItem: data.hero.comfort_item,
          ageBand: data.hero.age_band,
          sidekickName: data.hero.sidekick_name,
          sidekickArchetype: data.hero.sidekick_archetype,
        }
      : null,
    lastEpisode: data.last_episode
      ? {
          id: data.last_episode.id,
          episodeNumber: data.last_episode.episode_number,
          storyText: data.last_episode.story_text,
          episodeSummary: data.last_episode.episode_summary,
          choices: (data.last_episode.choices_json ?? {}) as Record<string, string>,
          tagsUsed: data.last_episode.tags_used ?? [],
          createdAt: data.last_episode.created_at,
        }
      : null,
    topTags: data.top_tags ?? [],
  };
};

export const saveDemoHero = async (demoId: string, hero: DemoHeroInput) => {
  const { error } = await supabase.functions.invoke('demo-save-hero', {
    body: { demoId, hero },
  });

  if (error) {
    throw error;
  }
};
