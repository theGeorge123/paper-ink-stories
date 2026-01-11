import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useLastStory(characterId: string | undefined) {
  return useQuery({
    queryKey: ['last-story', characterId],
    queryFn: async () => {
      if (!characterId) return null;

      // Get the most recent active story, or if none, the most recent story
      const { data: activeStory } = await supabase
        .from('stories')
        .select('id, title, created_at, length_setting, current_page')
        .eq('character_id', characterId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeStory) {
        // Get first page content for preview
        const { data: firstPage } = await supabase
          .from('pages')
          .select('content, page_number')
          .eq('story_id', activeStory.id)
          .order('page_number', { ascending: true })
          .limit(1)
          .single();

        const { count: totalPages } = await supabase
          .from('pages')
          .select('*', { count: 'exact', head: true })
          .eq('story_id', activeStory.id);

      return {
        ...activeStory,
        preview: firstPage?.content?.substring(0, 100) + '...',
        totalPages: totalPages || 0,
        currentPage: activeStory.current_page || 0,
        hasBookmark: (activeStory.current_page || 0) > 0,
      };
      }

      // If no active story, get the most recent story
      const { data: lastStory } = await supabase
        .from('stories')
        .select('id, title, created_at, length_setting, current_page')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastStory) return null;

      const { data: firstPage } = await supabase
        .from('pages')
        .select('content, page_number')
        .eq('story_id', lastStory.id)
        .order('page_number', { ascending: true })
        .limit(1)
        .single();

      const { count: totalPages } = await supabase
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', lastStory.id);

      return {
        ...lastStory,
        preview: firstPage?.content?.substring(0, 100) + '...',
        totalPages: totalPages || 0,
        currentPage: lastStory.current_page || 0,
        hasBookmark: (lastStory.current_page || 0) > 0,
      };
    },
    enabled: !!characterId,
  });
}
