import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BatchUrlResult {
  urls: Record<string, string | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Batch-fetch signed URLs for multiple hero portraits in a single API call.
 * Much faster than individual calls when displaying multiple characters.
 */
export function useBatchSignedUrls(heroIds: string[]): BatchUrlResult {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  const fetchUrls = useCallback(async () => {
    // Filter to only IDs we haven't fetched yet
    const idsToFetch = heroIds.filter(id => id && !fetchedRef.current.has(id));
    
    if (idsToFetch.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-image-url', {
        body: { heroIds: idsToFetch },
      });

      if (fnError) throw fnError;

      if (data?.urls) {
        // Mark as fetched and update state
        idsToFetch.forEach(id => fetchedRef.current.add(id));
        
        const newUrls: Record<string, string | null> = {};
        for (const [id, result] of Object.entries(data.urls)) {
          newUrls[id] = (result as { signedUrl: string | null })?.signedUrl || null;
        }
        
        setUrls(prev => ({ ...prev, ...newUrls }));
      }
    } catch (err) {
      console.error('Batch URL fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch image URLs');
    } finally {
      setLoading(false);
    }
  }, [heroIds]);

  // Force refresh all URLs (clear cache)
  const refresh = useCallback(async () => {
    fetchedRef.current.clear();
    setUrls({});
    await fetchUrls();
  }, [fetchUrls]);

  useEffect(() => {
    if (heroIds.length > 0) {
      fetchUrls();
    }
  }, [heroIds, fetchUrls]);

  return { urls, loading, error, refresh };
}
