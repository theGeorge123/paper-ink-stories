import { describe, it, expect } from 'vitest';
import { getTotalPages, getPageRangeLabel, getStoryPhase, type StoryPhase } from './storyEngine';

describe('storyEngine', () => {
  describe('getTotalPages', () => {
    it('should return 5 pages for SHORT length', () => {
      expect(getTotalPages('SHORT')).toBe(5);
    });

    it('should return 9 pages for MEDIUM length', () => {
      expect(getTotalPages('MEDIUM')).toBe(9);
    });

    it('should return 12 pages for LONG length', () => {
      expect(getTotalPages('LONG')).toBe(12);
    });

    it('should return default MEDIUM (9 pages) for undefined', () => {
      expect(getTotalPages(undefined)).toBe(9);
    });

    it('should return default MEDIUM (9 pages) for invalid value', () => {
      expect(getTotalPages('INVALID')).toBe(9);
    });

    it('should return default MEDIUM (9 pages) for empty string', () => {
      expect(getTotalPages('')).toBe(9);
    });

    it('should return default MEDIUM (9 pages) for null', () => {
      expect(getTotalPages(null as any)).toBe(9);
    });
  });

  describe('getPageRangeLabel', () => {
    it('should return "4-5" for SHORT length', () => {
      expect(getPageRangeLabel('SHORT')).toBe('4-5');
    });

    it('should return "6-9" for MEDIUM length', () => {
      expect(getPageRangeLabel('MEDIUM')).toBe('6-9');
    });

    it('should return "9-12" for LONG length', () => {
      expect(getPageRangeLabel('LONG')).toBe('9-12');
    });

    it('should return default MEDIUM ("6-9") for undefined', () => {
      expect(getPageRangeLabel(undefined)).toBe('6-9');
    });

    it('should return default MEDIUM ("6-9") for invalid value', () => {
      expect(getPageRangeLabel('INVALID')).toBe('6-9');
    });

    it('should return default MEDIUM ("6-9") for empty string', () => {
      expect(getPageRangeLabel('')).toBe('6-9');
    });
  });

  describe('getStoryPhase', () => {
    describe('SHORT story (5 pages)', () => {
      it('should return SETUP for page 1 (0% progress)', () => {
        expect(getStoryPhase(1, 'SHORT')).toBe('SETUP');
      });

      it('should return JOURNEY for page 2 (40% progress)', () => {
        expect(getStoryPhase(2, 'SHORT')).toBe('JOURNEY');
      });

      it('should return JOURNEY for page 3 (60% progress)', () => {
        expect(getStoryPhase(3, 'SHORT')).toBe('JOURNEY');
      });

      it('should return WINDDOWN for page 4 (80% progress)', () => {
        expect(getStoryPhase(4, 'SHORT')).toBe('WINDDOWN');
      });

      it('should return WINDDOWN for page 5 (100% progress)', () => {
        expect(getStoryPhase(5, 'SHORT')).toBe('WINDDOWN');
      });
    });

    describe('MEDIUM story (9 pages)', () => {
      it('should return SETUP for page 1 (~11% progress)', () => {
        expect(getStoryPhase(1, 'MEDIUM')).toBe('SETUP');
      });

      it('should return SETUP for page 2 (~22% progress)', () => {
        expect(getStoryPhase(2, 'MEDIUM')).toBe('SETUP');
      });

      it('should return JOURNEY for page 3 (~33% progress)', () => {
        expect(getStoryPhase(3, 'MEDIUM')).toBe('JOURNEY');
      });

      it('should return JOURNEY for page 5 (~56% progress)', () => {
        expect(getStoryPhase(5, 'MEDIUM')).toBe('JOURNEY');
      });

      it('should return JOURNEY for page 6 (~67% progress)', () => {
        expect(getStoryPhase(6, 'MEDIUM')).toBe('JOURNEY');
      });

      it('should return WINDDOWN for page 7 (~78% progress)', () => {
        expect(getStoryPhase(7, 'MEDIUM')).toBe('WINDDOWN');
      });

      it('should return WINDDOWN for page 9 (100% progress)', () => {
        expect(getStoryPhase(9, 'MEDIUM')).toBe('WINDDOWN');
      });
    });

    describe('LONG story (12 pages)', () => {
      it('should return SETUP for page 1 (~8% progress)', () => {
        expect(getStoryPhase(1, 'LONG')).toBe('SETUP');
      });

      it('should return SETUP for page 2 (~17% progress)', () => {
        expect(getStoryPhase(2, 'LONG')).toBe('SETUP');
      });

      it('should return JOURNEY for page 3 (25% progress - boundary)', () => {
        expect(getStoryPhase(3, 'LONG')).toBe('JOURNEY');
      });

      it('should return JOURNEY for page 4 (~33% progress)', () => {
        expect(getStoryPhase(4, 'LONG')).toBe('JOURNEY');
      });

      it('should return JOURNEY for page 6 (50% progress)', () => {
        expect(getStoryPhase(6, 'LONG')).toBe('JOURNEY');
      });

      it('should return WINDDOWN for page 9 (75% progress - boundary)', () => {
        expect(getStoryPhase(9, 'LONG')).toBe('WINDDOWN');
      });

      it('should return WINDDOWN for page 10 (~83% progress)', () => {
        expect(getStoryPhase(10, 'LONG')).toBe('WINDDOWN');
      });

      it('should return WINDDOWN for page 12 (100% progress)', () => {
        expect(getStoryPhase(12, 'LONG')).toBe('WINDDOWN');
      });
    });

    describe('phase boundaries', () => {
      it('should transition from SETUP to JOURNEY at exactly 25% progress', () => {
        // For LONG (12 pages), 25% = page 3
        // At exactly 25%, we're IN the journey phase (not < 0.25)
        expect(getStoryPhase(2.99, 'LONG')).toBe('SETUP');
        expect(getStoryPhase(3, 'LONG')).toBe('JOURNEY');
      });

      it('should transition from JOURNEY to WINDDOWN at exactly 75% progress', () => {
        // For LONG (12 pages), 75% = page 9
        // At exactly 75%, we're IN the winddown phase (not < 0.75)
        expect(getStoryPhase(8.99, 'LONG')).toBe('JOURNEY');
        expect(getStoryPhase(9, 'LONG')).toBe('WINDDOWN');
      });
    });
  });
});
