/**
 * Reading time estimation utility
 * Based on average reading speed of 150 words per minute
 */

const WORDS_PER_MINUTE = 150;

/**
 * Estimates reading time in minutes based on word count
 */
export function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/**
 * Estimates reading time from text content
 */
export function estimateReadingTimeFromText(text: string): number {
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  return estimateReadingTime(wordCount);
}

/**
 * Formats reading time as a human-readable string
 */
export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return '1 minute';
  }
  if (minutes < 5) {
    return `about ${minutes} minutes`;
  }
  if (minutes < 10) {
    return `${minutes} minutes`;
  }
  return `about ${minutes} minutes`;
}

/**
 * Gets reading time range for story length settings
 */
export function getReadingTimeRange(length: 'SHORT' | 'MEDIUM' | 'LONG'): { min: number; max: number; label: string } {
  switch (length) {
    case 'SHORT':
      return { min: 3, max: 5, label: '3-5 min' };
    case 'MEDIUM':
      return { min: 5, max: 8, label: '5-8 min' };
    case 'LONG':
      return { min: 10, max: 15, label: '10-15 min' };
    default:
      return { min: 5, max: 8, label: '5-8 min' };
  }
}
