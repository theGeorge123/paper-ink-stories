import { useMemo, useCallback } from 'react';
import { normalizeHeroImageUrl } from '@/lib/heroImage';
// v2 - Public URLs, no expiration

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
 * Hook that builds public URLs for hero portraits.
 * The bucket is now public, so no signed URLs needed - images never expire.
 */
export function useBatchSignedUrls(characters: CharacterWithUrl[]): BatchUrlResult {
  const urls = useMemo(() => {
    const result: Record<string, string | null> = {};
    characters.forEach(character => {
      result[character.id] = normalizeHeroImageUrl(character.hero_image_url);
    });
    return result;
  }, [characters]);

  const refresh = useCallback(() => {
    // No-op for public URLs - they don't expire
  }, []);

  return { urls, loading: false, error: null, refresh };
}
