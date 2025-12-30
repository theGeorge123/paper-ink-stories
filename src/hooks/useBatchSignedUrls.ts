import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedUrl {
  url: string;
  expiresAt: number; // timestamp
}

const CACHE_KEY = 'hero-portrait-urls';
const CACHE_DURATION = 5 * 60 * 60 * 1000; // 5 hours (signed URLs valid for 6h)

function getCache(): Record<string, CachedUrl> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, CachedUrl>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or unavailable
  }
}

interface BatchUrlResult {
  urls: Record<string, string | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Batch-fetch signed URLs for multiple hero portraits in a single API call.
 * Caches URLs in localStorage for fast loading on page refresh.
 */
export function useBatchSignedUrls(heroIds: string[]): BatchUrlResult {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  // Wait for auth to be ready
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setAuthReady(true);
      }
    });
    
    // Also check immediately in case auth is already ready
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load cached URLs immediately on mount
  useEffect(() => {
    const cache = getCache();
    const now = Date.now();
    const validUrls: Record<string, string | null> = {};
    
    heroIds.forEach(id => {
      if (cache[id] && cache[id].expiresAt > now) {
        validUrls[id] = cache[id].url;
        fetchedRef.current.add(id);
      }
    });
    
    if (Object.keys(validUrls).length > 0) {
      setUrls(validUrls);
    }
  }, [heroIds]);

  const fetchUrls = useCallback(async () => {
    // Filter to only IDs we haven't fetched yet
    const idsToFetch = heroIds.filter(id => id && !fetchedRef.current.has(id));
    
    if (idsToFetch.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      
      const { data, error: fnError } = await supabase.functions.invoke('get-image-url', {
        body: { heroIds: idsToFetch },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });

      if (fnError) throw fnError;

      if (data?.urls) {
        const cache = getCache();
        const now = Date.now();
        
        // Mark as fetched and update state
        idsToFetch.forEach(id => fetchedRef.current.add(id));
        
        const newUrls: Record<string, string | null> = {};
        for (const [id, result] of Object.entries(data.urls)) {
          const signedUrl = (result as { signedUrl: string | null })?.signedUrl || null;
          newUrls[id] = signedUrl;
          
          // Cache the URL
          if (signedUrl) {
            cache[id] = { url: signedUrl, expiresAt: now + CACHE_DURATION };
          }
        }
        
        setCache(cache);
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
    // Clear from localStorage cache too
    const cache = getCache();
    heroIds.forEach(id => delete cache[id]);
    setCache(cache);
    
    fetchedRef.current.clear();
    setUrls({});
    await fetchUrls();
  }, [fetchUrls, heroIds]);

  useEffect(() => {
    if (authReady && heroIds.length > 0) {
      fetchUrls();
    }
  }, [authReady, heroIds, fetchUrls]);

  return { urls, loading, error, refresh };
}
