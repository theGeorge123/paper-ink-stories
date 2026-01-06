import { useMemo, useCallback } from 'react';

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

// Public URL base for hero portraits (no expiration)
const SUPABASE_URL = 'https://rtmcisfdtnmdytvnmptx.supabase.co';

/**
 * Hook that builds public URLs for hero portraits.
 * The bucket is now public, so no signed URLs needed - images never expire.
 */
export function useBatchSignedUrls(characters: CharacterWithUrl[]): BatchUrlResult {
  const urls = useMemo(() => {
    const result: Record<string, string | null> = {};
    characters.forEach(character => {
      if (character.hero_image_url) {
        // Extract the storage path from the existing URL or build public URL
        // The storage path format is: {user_id}/{character_id}.png
        // We can extract it from hero_image_url or check if it's already a public URL
        const existingUrl = character.hero_image_url;
        
        // If it's a signed URL, convert to public URL
        if (existingUrl.includes('/object/sign/')) {
          // Extract path: hero-portraits/{user_id}/{character_id}.png
          const match = existingUrl.match(/hero-portraits\/([^?]+)/);
          if (match) {
            result[character.id] = `${SUPABASE_URL}/storage/v1/object/public/hero-portraits/${match[1]}`;
          } else {
            result[character.id] = existingUrl;
          }
        } else if (existingUrl.includes('/object/public/')) {
          // Already a public URL
          result[character.id] = existingUrl;
        } else {
          result[character.id] = existingUrl;
        }
      } else {
        result[character.id] = null;
      }
    });
    return result;
  }, [characters]);

  const refresh = useCallback(() => {
    // No-op for public URLs - they don't expire
  }, []);

  return { urls, loading: false, error: null, refresh };
}
