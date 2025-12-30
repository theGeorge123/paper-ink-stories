import { useCallback, useState, useEffect } from 'react';

interface Options {
  initialUrl?: string | null;
  heroId?: string;
  storyId?: string;
  pageNumber?: number;
}

export function useSignedImageUrl({ initialUrl }: Options) {
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL when initialUrl prop changes (e.g., when switching characters)
  useEffect(() => {
    setUrl(initialUrl || null);
    setError(null);
  }, [initialUrl]);

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
