import { useState } from 'react';
import { useAgeUpdateCheck } from '@/hooks/useAgeUpdateCheck';
import AgeUpdatePrompt from './AgeUpdatePrompt';

interface AgeUpdateManagerProps {
  characters: Array<{
    id: string;
    name: string;
    age_band?: string;
  }>;
}

export default function AgeUpdateManager({ characters }: AgeUpdateManagerProps) {
  const [dismissedCharacters, setDismissedCharacters] = useState<Set<string>>(new Set());

  // Check each character for age updates
  const characterChecks = characters.map((character) => {
    const check = useAgeUpdateCheck(character.id);
    return {
      character,
      check,
    };
  });

  // Find the first character that needs an update and hasn't been dismissed
  const characterToUpdate = characterChecks.find(
    ({ character, check }) =>
      check.data?.shouldShowReminder &&
      !dismissedCharacters.has(character.id) &&
      check.data.suggestedAgeBand
  );

  if (!characterToUpdate || !characterToUpdate.check.data) {
    return null;
  }

  const { character, check } = characterToUpdate;
  const { suggestedAgeBand, reason, monthsSinceCreation, storyCount } = check.data;

  if (!suggestedAgeBand) return null;

  return (
    <AgeUpdatePrompt
      characterId={character.id}
      characterName={character.name}
      currentAgeBand={character.age_band || '3-5'}
      suggestedAgeBand={suggestedAgeBand}
      reason={reason || 'time'}
      monthsSinceCreation={monthsSinceCreation}
      storyCount={storyCount}
      onDismiss={() => {
        setDismissedCharacters((prev) => new Set(prev).add(character.id));
      }}
    />
  );
}
