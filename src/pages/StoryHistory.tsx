import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import StoryHistory from '@/components/StoryHistory';
import { Skeleton } from '@/components/ui/skeleton';

export default function StoryHistoryPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();

  const { data: character, isLoading } = useQuery({
    queryKey: ['character', characterId],
    queryFn: async () => {
      if (!characterId) return null;
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, hero_image_url')
        .eq('id', characterId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!characterId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background paper-texture p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-8" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-background paper-texture p-6">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="font-serif text-2xl font-bold text-foreground mb-4">
            Character not found
          </h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <StoryHistory
      characterId={character.id}
      characterName={character.name}
      heroImageUrl={character.hero_image_url}
    />
  );
}
