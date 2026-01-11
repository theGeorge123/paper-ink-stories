import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AgeUpdatePrompt from './AgeUpdatePrompt';

interface AgeUpdateManagerProps {
  characters: Array<{
    id: string;
    name: string;
    age_band?: string;
  }>;
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

interface AgeUpdateCheck {
  characterId: string;
  shouldShowReminder: boolean;
  suggestedAgeBand: string | null;
  reason: 'time' | 'stories' | null;
  monthsSinceCreation?: number;
  storyCount?: number;
}

export default function AgeUpdateManager({ characters }: AgeUpdateManagerProps) {
  const [dismissedCharacters, setDismissedCharacters] = useState<Set<string>>(new Set());

  // Get character IDs for query key
  const characterIds = useMemo(() => characters.map(c => c.id).sort(), [characters]);

  // Single query to check all characters at once
  const { data: ageChecks } = useQuery({
    queryKey: ['age-update-checks', characterIds],
    queryFn: async (): Promise<AgeUpdateCheck[]> => {
      if (characterIds.length === 0) {
        return [];
      }

      const { data: characterData, error } = await supabase
        .from('characters')
        .select('id, age_band, created_at, story_count')
        .in('id', characterIds);

      if (error || !characterData) {
        return [];
      }

      return characterData.map((character): AgeUpdateCheck => {
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
          characterId: character.id,
          shouldShowReminder: shouldShow && !!suggestedAgeBand,
          suggestedAgeBand,
          reason,
          monthsSinceCreation,
          storyCount,
        };
      });
    },
    enabled: characterIds.length > 0,
    staleTime: 1000 * 60 * 60 * 24, // Check once per day
  });

  // Find the first character that needs an update and hasn't been dismissed
  const characterToUpdate = useMemo(() => {
    if (!ageChecks) return null;

    for (const check of ageChecks) {
      if (
        check.shouldShowReminder &&
        !dismissedCharacters.has(check.characterId) &&
        check.suggestedAgeBand
      ) {
        const character = characters.find(c => c.id === check.characterId);
        if (character) {
          return { character, check };
        }
      }
    }
    return null;
  }, [ageChecks, dismissedCharacters, characters]);

  if (!characterToUpdate) {
    return null;
  }

  const { character, check } = characterToUpdate;

  return (
    <AgeUpdatePrompt
      characterId={character.id}
      characterName={character.name}
      currentAgeBand={character.age_band || '3-5'}
      suggestedAgeBand={check.suggestedAgeBand!}
      reason={check.reason || 'time'}
      monthsSinceCreation={check.monthsSinceCreation}
      storyCount={check.storyCount}
      onDismiss={() => {
        setDismissedCharacters((prev) => new Set(prev).add(character.id));
      }}
    />
  );
}
