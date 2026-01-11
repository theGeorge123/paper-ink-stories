import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AgeUpdateCheck {
  shouldShowReminder: boolean;
  suggestedAgeBand: string | null;
  reason: 'time' | 'stories' | null;
  monthsSinceCreation?: number;
  storyCount?: number;
}

const AGE_BAND_PROGRESSION: Record<string, string[]> = {
  '1-2': ['3-5'],
  '3-5': ['6-8'],
  '6-8': ['9-12'],
  '9-12': [], // No progression beyond 9-12
};

function getNextAgeBand(currentAgeBand: string): string | null {
  const progression = AGE_BAND_PROGRESSION[currentAgeBand];
  return progression && progression.length > 0 ? progression[0] : null;
}

function getMonthsSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)); // Approximate months
}

export function useAgeUpdateCheck(characterId: string | undefined) {
  return useQuery({
    queryKey: ['age-update-check', characterId],
    queryFn: async (): Promise<AgeUpdateCheck> => {
      if (!characterId) {
        return { shouldShowReminder: false, suggestedAgeBand: null, reason: null };
      }

      // Fetch character with story count
      const { data: character, error } = await supabase
        .from('characters')
        .select('age_band, created_at, story_count')
        .eq('id', characterId)
        .single();

      if (error || !character) {
        return { shouldShowReminder: false, suggestedAgeBand: null, reason: null };
      }

      const currentAgeBand = character.age_band || '3-5';
      const monthsSinceCreation = getMonthsSince(character.created_at);
      const storyCount = character.story_count || 0;
      const suggestedAgeBand = getNextAgeBand(currentAgeBand);

      // Check if we should show reminder
      let shouldShow = false;
      let reason: 'time' | 'stories' | null = null;

      // Time-based check: 6 months for ages 1-5, 12 months for ages 6-12
      if (['1-2', '3-5'].includes(currentAgeBand)) {
        if (monthsSinceCreation >= 6) {
          shouldShow = true;
          reason = 'time';
        }
      } else if (['6-8', '9-12'].includes(currentAgeBand)) {
        if (monthsSinceCreation >= 12) {
          shouldShow = true;
          reason = 'time';
        }
      }

      // Story count check: suggest level-up after 50 stories
      if (storyCount >= 50 && suggestedAgeBand) {
        shouldShow = true;
        reason = reason || 'stories';
      }

      return {
        shouldShowReminder: shouldShow && !!suggestedAgeBand,
        suggestedAgeBand,
        reason,
        monthsSinceCreation,
        storyCount,
      };
    },
    enabled: !!characterId,
    staleTime: 1000 * 60 * 60 * 24, // Check once per day
  });
}
