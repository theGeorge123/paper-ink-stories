import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Force clean module reload

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
 * Hook that fetches fresh signed URLs for hero portraits via the edge function.
 * The URLs stored in the database expire, so we need to get fresh ones.
 */
export function useBatchSignedUrls(characters: CharacterWithUrl[]): BatchUrlResult {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get character IDs that have images
  const characterIds = useMemo(
    () => characters.filter(c => c.hero_image_url).map(c => c.id),
    [characters]
  );

  const fetchUrls = useCallback(async () => {
    if (characterIds.length === 0) {
      setUrls({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-image-url', {
        body: { heroIds: characterIds },
      });

      if (fnError) {
        console.error('Failed to fetch signed URLs:', fnError);
        setError('Failed to load images');
        // Fallback to stored URLs (may be expired but worth trying)
        const fallback: Record<string, string | null> = {};
        characters.forEach(c => {
          fallback[c.id] = c.hero_image_url || null;
        });
        setUrls(fallback);
        return;
      }

      // Build URL map from response
      const result: Record<string, string | null> = {};
      characters.forEach(c => {
        if (data?.urls?.[c.id]?.signedUrl) {
          result[c.id] = data.urls[c.id].signedUrl;
        } else {
          // Fallback to stored URL if not returned
          result[c.id] = c.hero_image_url || null;
        }
      });
      setUrls(result);
    } catch (err) {
      console.error('Error fetching signed URLs:', err);
      setError('Failed to load images');
      // Fallback to stored URLs
      const fallback: Record<string, string | null> = {};
      characters.forEach(c => {
        fallback[c.id] = c.hero_image_url || null;
      });
      setUrls(fallback);
    } finally {
      setLoading(false);
    }
  }, [characterIds, characters]);

  // Fetch on mount and when characters change
  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  return { urls, loading, error, refresh: fetchUrls };
}
