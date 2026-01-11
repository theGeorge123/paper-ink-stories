import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdaptiveQuestionOption {
  label: string;
  description?: string;
  icon?: string;
  value: string;
  estimated_time?: string;
  recommended?: boolean;
}

export interface AdaptiveQuestion {
  question_text: string;
  question_type: string;
  options: AdaptiveQuestionOption[];
}

export interface AdaptiveQuestionsResponse {
  questions: AdaptiveQuestion[];
}

export function useAdaptiveQuestions(characterId: string | undefined) {
  return useQuery({
    queryKey: ['adaptive-questions', characterId],
    queryFn: async (): Promise<AdaptiveQuestionsResponse | null> => {
      if (!characterId) return null;

      // Fetch character data needed for adaptive questions
      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('id, story_count, preferred_themes, avoided_themes, age_band')
        .eq('id', characterId)
        .single();

      if (charError || !character) {
        console.error('[useAdaptiveQuestions] Character fetch error:', charError);
        return null;
      }

      // Get last story info
      const { data: lastStory } = await supabase
        .from('stories')
        .select('created_at, themes')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Call adaptive questions edge function
      const { data, error } = await supabase.functions.invoke('generate-adaptive-questions', {
        body: {
          character_id: characterId,
          last_story_themes: (lastStory?.themes as string[]) || undefined,
          preferred_themes: (character.preferred_themes as string[]) || undefined,
          avoided_themes: (character.avoided_themes as string[]) || undefined,
          stories_count: character.story_count || 0,
          age_band: character.age_band || '3-5',
          last_story_date: lastStory?.created_at || undefined,
        },
      });

      if (error) {
        console.error('[useAdaptiveQuestions] Edge function error:', error);
        return null;
      }

      return data as AdaptiveQuestionsResponse;
    },
    enabled: !!characterId,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    retry: 1, // Only retry once on failure
  });
}
