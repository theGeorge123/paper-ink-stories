import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Options {
  initialUrl?: string | null;
  heroId?: string;
  storyId?: string;
  pageNumber?: number;
}

// Parse storage:// URLs to extract bucket and path
function parseStorageUrl(url: string | null | undefined): { bucket: string; path: string } | null {
  if (!url?.startsWith('storage://')) return null;
  const withoutProtocol = url.slice('storage://'.length);
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex === -1) return null;
  return {
    bucket: withoutProtocol.slice(0, slashIndex),
    path: withoutProtocol.slice(slashIndex + 1),
  };
}

export function useSignedImageUrl({ initialUrl, heroId, storyId, pageNumber }: Options) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

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

  const refresh = useCallback(async () => {
    // Determine if we need to fetch a signed URL
    const needsSignedUrl = heroId || (storyId && pageNumber);
    const isStorageUrl = parseStorageUrl(initialUrl);
    
    if (!needsSignedUrl && !isStorageUrl) {
      // Regular URL, use as-is
      if (initialUrl) setUrl(initialUrl);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      
      const { data, error: invokeError } = await supabase.functions.invoke('get-image-url', {
        body: { heroId, storyId, pageNumber },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      setLoading(false);

      if (invokeError) {
        console.error('Failed to refresh signed url', invokeError);
        setError(invokeError.message);
        return;
      }

      setUrl(data?.signedUrl ?? null);
    } catch (err) {
      console.error('Failed to refresh signed url', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [heroId, storyId, pageNumber, initialUrl]);

  useEffect(() => {
    if (!authReady) return;
    
    const isStorageUrl = parseStorageUrl(initialUrl);
    
    if (heroId || (storyId && pageNumber)) {
      refresh();
    } else if (isStorageUrl) {
      setUrl(null);
    } else if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [authReady, heroId, storyId, pageNumber, initialUrl, refresh]);

  const handleError = useCallback(() => {
    setError('load_failed');
  }, []);

  return { url, loading, error, refresh, handleError } as const;
}
