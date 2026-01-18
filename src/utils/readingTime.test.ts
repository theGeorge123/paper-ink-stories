import { describe, it, expect } from 'vitest';
import {
  estimateReadingTime,
  estimateReadingTimeFromText,
  formatReadingTime,
  getReadingTimeRange,
} from './readingTime';

describe('readingTime', () => {
  describe('estimateReadingTime', () => {
    it('should return 1 minute for 0 words (minimum)', () => {
      expect(estimateReadingTime(0)).toBe(1);
    });

    it('should return 1 minute for 1-150 words', () => {
      expect(estimateReadingTime(1)).toBe(1);
      expect(estimateReadingTime(75)).toBe(1);
      expect(estimateReadingTime(150)).toBe(1);
    });

    it('should return 2 minutes for 151-300 words', () => {
      expect(estimateReadingTime(151)).toBe(2);
      expect(estimateReadingTime(225)).toBe(2);
      expect(estimateReadingTime(300)).toBe(2);
    });

    it('should return 3 minutes for 301-450 words', () => {
      expect(estimateReadingTime(301)).toBe(3);
      expect(estimateReadingTime(450)).toBe(3);
    });

    it('should return 5 minutes for 600 words', () => {
      expect(estimateReadingTime(600)).toBe(4);
    });

    it('should return 10 minutes for 1500 words', () => {
      expect(estimateReadingTime(1500)).toBe(10);
    });

    it('should handle large word counts', () => {
      expect(estimateReadingTime(15000)).toBe(100);
    });

    it('should always round up (ceiling)', () => {
      // 151 words / 150 = 1.007, should round up to 2
      expect(estimateReadingTime(151)).toBe(2);
    });
  });

  describe('estimateReadingTimeFromText', () => {
    it('should return 1 minute for empty string', () => {
      expect(estimateReadingTimeFromText('')).toBe(1);
    });

    it('should return 1 minute for whitespace only', () => {
      expect(estimateReadingTimeFromText('   \n\t  ')).toBe(1);
    });

    it('should count single word correctly', () => {
      expect(estimateReadingTimeFromText('Hello')).toBe(1);
    });

    it('should count multiple words correctly', () => {
      expect(estimateReadingTimeFromText('Hello world from testing')).toBe(1);
    });

    it('should handle multiple spaces between words', () => {
      expect(estimateReadingTimeFromText('Hello    world')).toBe(1);
    });

    it('should handle newlines and tabs', () => {
      expect(estimateReadingTimeFromText('Hello\nworld\tfrom\ntesting')).toBe(1);
    });

    it('should calculate correct reading time for 150 words', () => {
      const words = Array(150).fill('word').join(' ');
      expect(estimateReadingTimeFromText(words)).toBe(1);
    });

    it('should calculate correct reading time for 300 words', () => {
      const words = Array(300).fill('word').join(' ');
      expect(estimateReadingTimeFromText(words)).toBe(2);
    });

    it('should handle punctuation correctly', () => {
      expect(estimateReadingTimeFromText('Hello, world! How are you?')).toBe(1);
    });

    it('should handle a typical short paragraph', () => {
      const text = `
        Once upon a time, in a land far away, there lived a brave knight.
        The knight embarked on an epic journey to save the kingdom.
        Along the way, many challenges were faced and overcome.
      `;
      // This is roughly 30 words, should be 1 minute
      expect(estimateReadingTimeFromText(text)).toBe(1);
    });

    it('should handle a longer text (200+ words)', () => {
      const words = Array(225).fill('word').join(' ');
      expect(estimateReadingTimeFromText(words)).toBe(2);
    });
  });

  describe('formatReadingTime', () => {
    it('should format 1 minute as "1 minute"', () => {
      expect(formatReadingTime(1)).toBe('1 minute');
    });

    it('should format 2 minutes as "about 2 minutes"', () => {
      expect(formatReadingTime(2)).toBe('about 2 minutes');
    });

    it('should format 3 minutes as "about 3 minutes"', () => {
      expect(formatReadingTime(3)).toBe('about 3 minutes');
    });

    it('should format 4 minutes as "about 4 minutes"', () => {
      expect(formatReadingTime(4)).toBe('about 4 minutes');
    });

    it('should format 5 minutes as "5 minutes"', () => {
      expect(formatReadingTime(5)).toBe('5 minutes');
    });

    it('should format 6 minutes as "6 minutes"', () => {
      expect(formatReadingTime(6)).toBe('6 minutes');
    });

    it('should format 9 minutes as "9 minutes"', () => {
      expect(formatReadingTime(9)).toBe('9 minutes');
    });

    it('should format 10 minutes as "about 10 minutes"', () => {
      expect(formatReadingTime(10)).toBe('about 10 minutes');
    });

    it('should format 15 minutes as "about 15 minutes"', () => {
      expect(formatReadingTime(15)).toBe('about 15 minutes');
    });

    it('should format 30 minutes as "about 30 minutes"', () => {
      expect(formatReadingTime(30)).toBe('about 30 minutes');
    });

    it('should format 100 minutes as "about 100 minutes"', () => {
      expect(formatReadingTime(100)).toBe('about 100 minutes');
    });
  });

  describe('getReadingTimeRange', () => {
    it('should return correct range for SHORT', () => {
      const result = getReadingTimeRange('SHORT');
      expect(result).toEqual({
        min: 3,
        max: 5,
        label: '3-5 min',
      });
    });

    it('should return correct range for MEDIUM', () => {
      const result = getReadingTimeRange('MEDIUM');
      expect(result).toEqual({
        min: 5,
        max: 8,
        label: '5-8 min',
      });
    });

    it('should return correct range for LONG', () => {
      const result = getReadingTimeRange('LONG');
      expect(result).toEqual({
        min: 10,
        max: 15,
        label: '10-15 min',
      });
    });

    it('should return MEDIUM as default for invalid input', () => {
      const result = getReadingTimeRange('INVALID' as any);
      expect(result).toEqual({
        min: 5,
        max: 8,
        label: '5-8 min',
      });
    });
  });

  describe('integration tests', () => {
    it('should correctly estimate and format reading time for typical story page', () => {
      const storyPage = `
        The sun was setting over the mountains as our hero began their journey.
        With courage in their heart and determination in their eyes, they stepped
        forward into the unknown. The path ahead was treacherous, but they had
        come too far to turn back now. Every step brought new challenges, new
        lessons, and new strength. This was just the beginning of an epic tale
        that would be remembered for generations to come.
      `;

      const minutes = estimateReadingTimeFromText(storyPage);
      const formatted = formatReadingTime(minutes);

      // This text has roughly 75 words, should be 1 minute
      expect(minutes).toBe(1);
      expect(formatted).toBe('1 minute');
    });

    it('should handle complete workflow: text -> estimate -> format', () => {
      const shortText = 'Hello world';
      const shortMinutes = estimateReadingTimeFromText(shortText);
      expect(formatReadingTime(shortMinutes)).toBe('1 minute');

      const mediumText = Array(200).fill('word').join(' ');
      const mediumMinutes = estimateReadingTimeFromText(mediumText);
      expect(formatReadingTime(mediumMinutes)).toBe('about 2 minutes');

      const longText = Array(900).fill('word').join(' ');
      const longMinutes = estimateReadingTimeFromText(longText);
      expect(formatReadingTime(longMinutes)).toBe('6 minutes');
    });
  });
});
