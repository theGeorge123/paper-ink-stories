import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to manage story progress (bookmark)
 * Auto-saves current page and provides resume functionality
 */
export function useStoryProgress(storyId: string | undefined, currentPageIndex: number) {
  const queryClient = useQueryClient();

  // Auto-save progress when page changes
  const saveProgress = useCallback(
    async (pageIndex: number) => {
      if (!storyId || pageIndex < 0) return;

      try {
        // Convert 0-based index to 1-based page number
        const pageNumber = pageIndex + 1;

        await supabase
          .from('stories')
          .update({ current_page: pageNumber })
          .eq('id', storyId);

        // Invalidate story query to refresh data
        queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      } catch (error) {
        console.error('Failed to save story progress:', error);
      }
    },
    [storyId, queryClient]
  );

  // Auto-save when page changes (debounced)
  useEffect(() => {
    if (!storyId) return;

    const timeoutId = setTimeout(() => {
      saveProgress(currentPageIndex);
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [currentPageIndex, storyId, saveProgress]);

  // Get saved progress
  const { data: story } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      if (!storyId) return null;
      const { data, error } = await supabase
        .from('stories')
        .select('current_page, is_active')
        .eq('id', storyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storyId,
  });

  const savedPage = story?.current_page || 0;
  const hasBookmark = savedPage > 0;

  return {
    savedPage,
    hasBookmark,
    saveProgress,
  };
}
