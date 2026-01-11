import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { formatReadingTime, estimateReadingTimeFromText } from '@/utils/readingTime';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';

interface StoryHistoryProps {
  characterId: string;
  characterName: string;
  heroImageUrl?: string | null;
}

interface StoryWithPreview {
  id: string;
  title: string | null;
  created_at: string;
  length_setting: string;
  is_active: boolean;
  firstPageContent?: string;
  pageCount?: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

export default function StoryHistory({ characterId, characterName, heroImageUrl }: StoryHistoryProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const { data: stories, isLoading } = useQuery({
    queryKey: ['story-history', characterId],
    queryFn: async () => {
      // Fetch all stories for this character
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('id, title, created_at, length_setting, is_active')
        .eq('character_id', characterId)
        .order('created_at', { ascending: false });

      if (storiesError) throw storiesError;
      if (!storiesData) return [];

      // Fetch first page content for each story to show preview
      const storiesWithPreview: StoryWithPreview[] = await Promise.all(
        storiesData.map(async (story) => {
          const { data: firstPage } = await supabase
            .from('pages')
            .select('content, page_number')
            .eq('story_id', story.id)
            .eq('page_number', 1)
            .single();

          const { count: pageCount } = await supabase
            .from('pages')
            .select('*', { count: 'exact', head: true })
            .eq('story_id', story.id);

          return {
            ...story,
            firstPageContent: firstPage?.content,
            pageCount: pageCount || 0,
          };
        })
      );

      return storiesWithPreview;
    },
  });

  const heroPortrait = useSignedImageUrl({
    initialUrl: heroImageUrl,
    heroId: characterId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background paper-texture p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!stories || stories.length === 0) {
    return (
      <div className="min-h-screen bg-background paper-texture p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'nl' ? 'Terug' : language === 'sv' ? 'Tillbaka' : 'Back'}
          </Button>
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
              {language === 'nl' ? 'Nog geen verhalen' : language === 'sv' ? 'Inga berättelser ännu' : 'No stories yet'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === 'nl'
                ? 'Begin je eerste avontuur om het hier te zien.'
                : language === 'sv'
                ? 'Starta ditt första äventyr för att se det här.'
                : 'Start your first adventure to see it here.'}
            </p>
            <Button onClick={() => navigate(`/questions/${characterId}`)}>
              {language === 'nl' ? 'Begin avontuur' : language === 'sv' ? 'Starta äventyr' : 'Start Adventure'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'nl' ? 'Terug' : language === 'sv' ? 'Tillbaka' : 'Back'}
          </Button>
          <div className="flex items-center gap-3">
            {heroPortrait.url && (
              <img
                src={heroPortrait.url}
                alt={characterName}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">
                {characterName}'s {language === 'nl' ? 'Verhalen' : language === 'sv' ? 'Berättelser' : 'Stories'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {stories.map((story, index) => {
            const previewText = story.firstPageContent
              ? story.firstPageContent.split('\n\n')[0].substring(0, 150) + '...'
              : '';
            const readingTime = story.firstPageContent
              ? estimateReadingTimeFromText(story.firstPageContent)
              : null;

            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-border/60 rounded-xl bg-card p-6 hover:border-primary/60 transition-colors cursor-pointer"
                onClick={() => navigate(`/read/${story.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-serif text-xl font-semibold text-foreground">
                        {story.title || `${characterName}'s Adventure`}
                      </h3>
                      {story.is_active && (
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {language === 'nl' ? 'Actief' : language === 'sv' ? 'Aktiv' : 'Active'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(story.created_at)}
                      </div>
                      {readingTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatReadingTime(readingTime)}
                        </div>
                      )}
                      {story.pageCount && story.pageCount > 0 && (
                        <span>{story.pageCount} {story.pageCount === 1 ? 'page' : 'pages'}</span>
                      )}
                    </div>
                    {previewText && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {previewText}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/read/${story.id}`);
                    }}
                  >
                    <BookOpen className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
