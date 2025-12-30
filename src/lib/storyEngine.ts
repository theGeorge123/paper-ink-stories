// Story engine utilities - page generation is handled by the edge function

export interface StoryState {
  location: string | null;
  inventory: string[];
}

export type StoryPhase = 'SETUP' | 'JOURNEY' | 'WINDDOWN';

const LENGTH_PAGES = {
  SHORT: 5,
  MEDIUM: 9,
  LONG: 12,
};

const LENGTH_PAGE_RANGES = {
  SHORT: '4-5',
  MEDIUM: '6-9',
  LONG: '9-12',
};

export function getTotalPages(lengthSetting: 'SHORT' | 'MEDIUM' | 'LONG'): number {
  return LENGTH_PAGES[lengthSetting];
}

export function getPageRangeLabel(lengthSetting: 'SHORT' | 'MEDIUM' | 'LONG'): string {
  return LENGTH_PAGE_RANGES[lengthSetting];
}

export function getStoryPhase(currentPage: number, lengthSetting: 'SHORT' | 'MEDIUM' | 'LONG'): StoryPhase {
  const totalPages = LENGTH_PAGES[lengthSetting];
  const progress = currentPage / totalPages;
  
  if (progress < 0.25) return 'SETUP';
  if (progress < 0.75) return 'JOURNEY';
  return 'WINDDOWN';
}
