import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Moon, MoonStar, Sunrise, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTotalPages, getPageRangeLabel } from '@/lib/storyEngine';
import { toast } from 'sonner';
import SleepWellScreen from '@/components/SleepWellScreen';
import SkeletonLoader from '@/components/SkeletonLoader';
import CoverPage from '@/components/CoverPage';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';
import { useLanguage } from '@/hooks/useLanguage';
import { sanitizeStoryText } from '@/lib/textSanitizer';

const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    rotateY: direction > 0 ? 5 : -5,
  }),
  center: {
    x: 0,
    opacity: 1,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    rotateY: direction < 0 ? 5 : -5,
  }),
};

const themes = {
  day: {
    background: 'bg-white',
    text: 'text-gray-900',
    muted: 'text-gray-600',
    footer: 'bg-white/95',
  },
  sepia: {
    background: 'bg-[#f5e6c9]',
    text: 'text-[#4b3b2b]',
    muted: 'text-[#6b4c2a]',
    footer: 'bg-[#f5e6c9]/95',
  },
  night: {
    background: 'bg-[#1f2933]',
    text: 'text-[#f0f4f8]',
    muted: 'text-[#cbd2d9]',
    footer: 'bg-[#1f2933]/95',
  }
} as const;

const themeOptions = [
  { key: 'day', label: 'Day', icon: Sun },
  { key: 'sepia', label: 'Sepia', icon: Sunrise },
  { key: 'night', label: 'Night', icon: Moon },
] as const;

export type ThemeKey = typeof themeOptions[number]['key'];

type StoryPage = {
  page_number: number;
  content: string | null;
};

export default function Reader() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showEnding, setShowEnding] = useState(false);
  const [direction, setDirection] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>('day');
  const [hasOpenedCover, setHasOpenedCover] = useState(false);

  const activeTheme = themes[theme];

  const fetchStory = useCallback(async () => {
    if (!storyId) return null;
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, length_setting, current_page, is_active, generated_options, themes, characters(id, name, hero_image_url, age_band)')
      .eq('id', storyId)
      .single();

    if (error) {
      toast.error('Failed to load story');
      throw error;
    }

    return data;
  }, [storyId]);

  const { data: story, isLoading: storyLoading } = useQuery({
    queryKey: ['story', storyId],
    queryFn: fetchStory,
    enabled: !!storyId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Get age_band from character
  const ageBand = story?.characters?.age_band;

  useEffect(() => {
    if (story && !story?.characters?.hero_image_url) {
      setHasOpenedCover(true);
    }
  }, [story]);

  const heroPortrait = useSignedImageUrl({
    initialUrl: story?.characters?.hero_image_url,
    heroId: story?.characters?.id,
  });

  const fetchPage = useCallback(async (pageIndex: number): Promise<StoryPage | null> => {
    if (!storyId) return null;
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('story_id', storyId)
      .eq('page_number', pageIndex)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      toast.error('Could not load this page');
      throw error;
    }

    return data as StoryPage | null;
  }, [storyId]);

  const { data: currentPage, isFetching: pageFetching } = useQuery({
    queryKey: ['storyPage', storyId, currentPageIndex],
    queryFn: () => fetchPage(currentPageIndex),
    enabled: !!storyId,
    placeholderData: (prev) => prev,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchInterval: (query) => (query.state.data ? false : 1200),
  });

  const lengthSetting = story?.length_setting as 'SHORT' | 'MEDIUM' | 'LONG' | undefined;
  const totalPages = lengthSetting ? getTotalPages(lengthSetting) : 0;
  const configuredRange = lengthSetting ? getPageRangeLabel(lengthSetting) : undefined;
  const totalPagesDisplay = configuredRange ? `~${configuredRange}` : totalPages.toString();

  useEffect(() => {
    if (!storyId || !totalPages) return;
    const targets = [currentPageIndex + 1, currentPageIndex + 2];
    targets
      .filter((page) => page < totalPages)
      .forEach((page) => {
        queryClient.prefetchQuery({
          queryKey: ['storyPage', storyId, page],
          queryFn: () => fetchPage(page),
          staleTime: Infinity,
          gcTime: Infinity,
        });
      });
  }, [storyId, currentPageIndex, totalPages, queryClient, fetchPage]);

  const handleTapLeft = () => {
    if (currentPageIndex > 0) {
      setDirection(-1);
      setCurrentPageIndex((prev) => prev - 1);
    }
  };

  const handleTapRight = () => {
    if (totalPages && currentPageIndex < totalPages - 1) {
      setDirection(1);
      setCurrentPageIndex((prev) => prev + 1);
    } else if (totalPages && currentPageIndex >= totalPages - 1) {
      setShowEnding(true);
    }
  };

  if (showEnding && story?.characters) {
    return (
      <SleepWellScreen
        characterName={story.characters.name}
        characterId={story.characters.id}
        storyId={storyId!}
        ageBand={ageBand}
      />
    );
  }

  const isCoverVisible = !!((heroPortrait.url || story?.characters?.hero_image_url) && !hasOpenedCover);

  if (isCoverVisible && story) {
    return (
      <CoverPage
        title={story.title || `${story.characters.name}'s story`}
        heroImageUrl={heroPortrait.url || story.characters.hero_image_url}
        onOpen={() => setHasOpenedCover(true)}
      />
    );
  }

  return (
    <div className={`h-screen paper-texture flex flex-col overflow-hidden ${activeTheme.background} ${activeTheme.text}`}>
      <header className="flex-shrink-0 p-4 flex justify-between items-center z-10 backdrop-blur-sm">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <Home className="w-5 h-5" />
          </Button>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/10 bg-black/5 px-2 py-1 backdrop-blur-md">
            {themeOptions.map(option => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.key}
                  size="sm"
                  variant={theme === option.key ? 'secondary' : 'ghost'}
                  onClick={() => setTheme(option.key)}
                  className="h-8 px-3"
                  aria-pressed={theme === option.key}
                >
                  <Icon className="w-4 h-4" />
                  <span className="ml-1 hidden md:inline">{option.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="max-w-xl mx-auto" style={{ perspective: '1000px' }}>
          {story?.title && currentPageIndex === 0 && (
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-serif text-2xl text-center mb-8 pt-4 ${activeTheme.text}`}
            >
              {story.title}
            </motion.h1>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            {storyLoading && !currentPage ? (
              <motion.div
                key="loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonLoader type="reader" />
              </motion.div>
            ) : currentPage ? (
              <motion.div
                key={`${storyId}-${currentPageIndex}`}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  rotateY: { duration: 0.3 },
                }}
                className={`story-text py-4 ${activeTheme.text} ${ageBand === '1-2' ? 'text-2xl sm:text-[28px] leading-[1.9] space-y-8' : 'text-lg leading-relaxed space-y-6'}`}
              >
                <div className={`${ageBand === '1-2' ? 'whitespace-pre-wrap' : 'whitespace-pre-line'}`}>
                  {sanitizeStoryText(currentPage.content)}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="turning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center py-12 ${activeTheme.muted}`}
              >
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <MoonStar className="w-6 h-6 text-primary" />
                  </motion.div>
                  <p className="font-serif">{t('turningPage')}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {totalPages && currentPageIndex >= totalPages - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center mt-8 pb-8"
            >
              <motion.p
                className={`text-sm ${activeTheme.muted}`}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {t('tapToContinue')}
              </motion.p>
            </motion.div>
          )}
        </div>
      </main>

      <div className="absolute inset-0 flex pointer-events-none" style={{ top: '64px', bottom: '96px' }}>
        <button
          className="w-1/3 h-full pointer-events-auto active:bg-black/5 transition-colors"
          onClick={handleTapLeft}
        />
        <div className="w-1/3" />
        <button
          className="w-1/3 h-full pointer-events-auto active:bg-black/5 transition-colors"
          onClick={handleTapRight}
        />
      </div>

      <footer className={`flex-shrink-0 p-4 text-center text-sm ${activeTheme.footer} ${activeTheme.muted}`}>
        {totalPagesDisplay ? `${currentPageIndex + 1} / ${totalPagesDisplay}` : 'Loading story...'}
        {pageFetching && <span className="ml-2">(refreshing)</span>}
      </footer>
    </div>
  );
}
