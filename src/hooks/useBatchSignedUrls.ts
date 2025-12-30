import { useState, useEffect, useCallback, useMemo } from 'react';

interface CharacterWithUrl {
  id: string;
  hero_image_url?: string | null;
}

interface BatchUrlResult {
  urls: Record<string, string | null>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Simple hook that extracts hero portrait URLs from character data.
 * Uses existing signed URLs from characters directly - no edge function calls needed.
 */
export function useBatchSignedUrls(characters: CharacterWithUrl[]): BatchUrlResult {
  const urls = useMemo(() => {
    const result: Record<string, string | null> = {};
    characters.forEach(character => {
      result[character.id] = character.hero_image_url || null;
    });
    return result;
  }, [characters]);

  // Refresh is a no-op for now - URLs come from the query refetch
  const refresh = useCallback(() => {
    // The parent component should invalidate the characters query to get fresh URLs
    console.log('Refresh requested - invalidate characters query to get fresh URLs');
  }, []);

  return { urls, loading: false, error: null, refresh };
}
