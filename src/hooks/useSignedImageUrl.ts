import { useCallback, useState } from 'react';

interface Options {
  initialUrl?: string | null;
  heroId?: string;
  storyId?: string;
  pageNumber?: number;
}

export function useSignedImageUrl({ initialUrl }: Options) {
  const [url] = useState<string | null>(initialUrl || null);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Just use the URL directly - it's already a signed URL from the database
  const refresh = useCallback(() => {
    // Refresh is handled by parent query refetch
    console.log('Refresh requested - refetch character data to get fresh URL');
  }, []);

  const handleError = useCallback(() => {
    setError('load_failed');
  }, []);

  return { url, loading, error, refresh, handleError } as const;
}
