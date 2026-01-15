/**
 * Demo Storage - Cookie-based storage for demo story flow
 */

const DEMO_ID_KEY = 'paperink_demo_id';
const DEMO_HERO_KEY = 'paperink_demo_hero';

export interface DemoHeroInput {
  heroName: string;
  heroType: string;
  heroTrait?: string;
  comfortItem?: string;
  sidekickName?: string | null;
  sidekickArchetype?: string | null;
}

/**
 * Generate a unique demo ID
 */
export const generateDemoId = (): string => {
  return `demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Store demo ID in a cookie
 */
export const storeDemoId = (demoId: string): void => {
  document.cookie = `${DEMO_ID_KEY}=${demoId}; path=/; max-age=86400; SameSite=Strict`;
};

/**
 * Get demo ID from cookie
 */
export const getDemoIdFromCookie = (): string | null => {
  const match = document.cookie.match(new RegExp(`(^| )${DEMO_ID_KEY}=([^;]+)`));
  return match ? match[2] : null;
};

/**
 * Clear demo ID cookie
 */
export const clearDemoId = (): void => {
  document.cookie = `${DEMO_ID_KEY}=; path=/; max-age=0`;
};

/**
 * Store demo hero data
 */
export const storeDemoHero = (hero: DemoHeroInput): void => {
  try {
    sessionStorage.setItem(DEMO_HERO_KEY, JSON.stringify(hero));
  } catch (e) {
    console.warn('Failed to store demo hero:', e);
  }
};

/**
 * Get demo hero data
 */
export const getDemoHero = (): DemoHeroInput | null => {
  try {
    const data = sessionStorage.getItem(DEMO_HERO_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Clear demo hero data
 */
export const clearDemoHero = (): void => {
  sessionStorage.removeItem(DEMO_HERO_KEY);
};

/**
 * Build route for demo story
 */
export const buildDemoRoute = (demoId: string): string => {
  return `/demo/${demoId}`;
};
