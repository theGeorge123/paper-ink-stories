import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Options {
  initialUrl?: string | null;
  heroId?: string;
  storyId?: string;
  pageNumber?: number;
}

export function useSignedImageUrl({ initialUrl, heroId, storyId, pageNumber }: Options) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!heroId && !storyId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error: invokeError } = await supabase.functions.invoke('get-image-url', {
        body: { heroId, storyId, pageNumber },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
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
  }, [heroId, storyId, pageNumber]);

  useEffect(() => {
    if (heroId || (storyId && pageNumber)) {
      refresh();
    } else if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [heroId, storyId, pageNumber, initialUrl, refresh]);

  const handleError = useCallback(() => {
    setError('load_failed');
  }, []);

  return { url, loading, error, refresh, handleError } as const;
}
