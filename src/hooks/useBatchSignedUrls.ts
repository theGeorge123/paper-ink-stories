import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedUrl {
  url: string;
  expiresAt: number; // timestamp
}

interface CharacterWithUrl {
  id: string;
  hero_image_url?: string | null;
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

// Check if a URL is a valid signed URL (not expired based on simple heuristics)
function isValidSignedUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  // Check if it's a supabase storage signed URL
  if (url.includes('/storage/v1/object/sign/') && url.includes('token=')) {
    return true;
  }
  return false;
}

interface BatchUrlResult {
  urls: Record<string, string | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Batch-fetch signed URLs for multiple hero portraits.
 * Uses existing valid URLs from characters first, only fetches from edge function when needed.
 */
export function useBatchSignedUrls(characters: CharacterWithUrl[]): BatchUrlResult {
  const [urls, setUrls] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());

  const heroIds = useMemo(() => characters.map(c => c.id), [characters]);

  // Wait for auth to be ready
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session) {
        setAuthReady(true);
      }
    };
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (session) {
          setAuthReady(true);
        } else if (event === 'SIGNED_OUT') {
          setAuthReady(false);
        }
      }
    });
    
    checkAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Use existing URLs from characters and cache
  useEffect(() => {
    const cache = getCache();
    const now = Date.now();
    const validUrls: Record<string, string | null> = {};
    
    characters.forEach(character => {
      // First check if character already has a valid signed URL
      if (isValidSignedUrl(character.hero_image_url)) {
        validUrls[character.id] = character.hero_image_url!;
        fetchedRef.current.add(character.id);
        // Also update cache
        cache[character.id] = { url: character.hero_image_url!, expiresAt: now + CACHE_DURATION };
      } 
      // Then check localStorage cache
      else if (cache[character.id] && cache[character.id].expiresAt > now) {
        validUrls[character.id] = cache[character.id].url;
        fetchedRef.current.add(character.id);
      }
    });
    
    if (Object.keys(validUrls).length > 0) {
      setCache(cache);
      setUrls(validUrls);
    }
  }, [characters]);

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
      });

      if (fnError) throw fnError;

      if (data?.urls) {
        const cache = getCache();
        const now = Date.now();
        
        idsToFetch.forEach(id => fetchedRef.current.add(id));
        
        const newUrls: Record<string, string | null> = {};
        for (const [id, result] of Object.entries(data.urls)) {
          const signedUrl = (result as { signedUrl: string | null })?.signedUrl || null;
          newUrls[id] = signedUrl;
          
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
