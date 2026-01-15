import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MoonStar, Sun, Sunrise, Moon, UserCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPageRangeLabel, getTotalPages } from '@/lib/storyEngine';
import { toast } from 'sonner';
import SleepWellScreen from '@/components/SleepWellScreen';
import SkeletonLoader from '@/components/SkeletonLoader';
import CoverPage from '@/components/CoverPage';
import StoryErrorState from '@/components/StoryErrorState';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';
import { useLanguage } from '@/hooks/useLanguage';
import { useStoryProgress } from '@/hooks/useStoryProgress';
// Page turn animation variants
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

type ThemeKey = typeof themeOptions[number]['key'];

const Reader = forwardRef<HTMLDivElement, Record<string, never>>(function Reader(_props, ref) {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  // CRITICAL: currentPageIndex is user-controlled, not auto-updated
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [direction, setDirection] = useState(0);
  const [adventureSummary, setAdventureSummary] = useState<string | undefined>();
  const [nextOptions, setNextOptions] = useState<string[] | undefined>();
  const [storyThemes, setStoryThemes] = useState<string[]>([]);
  const [prefetchingNext, setPrefetchingNext] = useState(false);
  const [existingLifeSummary, setExistingLifeSummary] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeKey>('day');
  const [hasOpenedCover, setHasOpenedCover] = useState(false);
  const [generationError, setGenerationError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pageTransitioning, setPageTransitioning] = useState(false);
  const MAX_RETRIES = 3;

  // Track inflight requests by page number to prevent duplicates
  const inflightRequests = useRef<Set<number>>(new Set());
  const prefetchInProgress = useRef(false);

  const activeTheme = themes[theme];

  const { data: story, refetch: refetchStory } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*, characters(*)')
        .eq('id', storyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storyId,
  });

  const { data: pages = [], refetch: refetchPages } = useQuery({
    queryKey: ['pages', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('story_id', storyId)
        .order('page_number', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!storyId,
    // Poll more frequently when prefetching
    refetchInterval: prefetchingNext ? 1000 : false,
  });

  const heroPortrait = useSignedImageUrl({
    initialUrl: story?.characters?.hero_image_url,
    heroId: story?.characters?.id,
  });

  // Bookmark and progress tracking
  const { savedPage, hasBookmark, saveProgress } = useStoryProgress(storyId, currentPageIndex);

  // Generate page mutation with deduplication and error handling
  const generatePage = useCallback(async (targetPageNumber: number, isBackground = false) => {
    if (!storyId) return null;

    // Prevent duplicate inflight requests for same page
    if (inflightRequests.current.has(targetPageNumber)) {
      console.log(`[Reader] Page ${targetPageNumber} already inflight, skipping`);
      return null;
    }

    console.log(`[Reader] Generating page ${targetPageNumber} (background: ${isBackground})`);
    inflightRequests.current.add(targetPageNumber);

    if (!isBackground) {
      setGenerating(true);
      setGenerationError(false);
    } else {
      setPrefetchingNext(true);
      prefetchInProgress.current = true;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-page', {
        body: { storyId, targetPage: targetPageNumber },
      });

      if (error) {
        console.error('Generation error:', error);

        // Check for insufficient credits error
        const errorBody = error.context?.json || error.context?.body || error.context || error;
        const isInsufficientCredits =
          errorBody?.error === 'insufficient_credits' ||
          errorBody?.error?.message === 'insufficient_credits';

        if (isInsufficientCredits && !isBackground) {
          setGenerationError(true);
          toast.error('You need 1 credit to generate a story. Please purchase more credits or subscribe.', {
            action: {
              label: 'Get Credits',
              onClick: () => navigate('/pricing'),
            },
          });
          return null;
        }

        if (!isBackground) {
          setGenerationError(true);
          if (retryCount < MAX_RETRIES) {
            toast.error(`Story magic needs a moment. Retry ${retryCount + 1}/${MAX_RETRIES}`);
          } else {
            toast.error("The story magic is taking a longer rest. Please try again later.");
          }
        }
        return null;
      }

      if (data?.fallback) {
        if (!isBackground) {
          setGenerationError(true);
          toast.error(data.page_text || "The story magic is taking a short nap. Try again in a moment.");
        }
        return null;
      }

      // Success - reset error state
      setGenerationError(false);
      setRetryCount(0);

      if (data?.is_ending) {
        if (data?.adventure_summary) {
          setAdventureSummary(data.adventure_summary);
        }
        if (data?.next_options) {
          setNextOptions(data.next_options);
        }
        if (data?.story_themes) {
          setStoryThemes(data.story_themes);
        }
      }

      // Refresh pages data
      await refetchPages();
      await refetchStory();

      console.log(`[Reader] Page ${targetPageNumber} generated successfully`);
      return data;
    } catch (err) {
      console.error('Generation exception:', err);
      if (!isBackground) {
        setGenerationError(true);
      }
      return null;
    } finally {
      inflightRequests.current.delete(targetPageNumber);
      if (!isBackground) setGenerating(false);
      else {
        setPrefetchingNext(false);
        prefetchInProgress.current = false;
      }
    }
  }, [storyId, refetchPages, refetchStory, retryCount]);

  // Initial page generation - only when no pages exist
  // The Questions page starts generation in background, so we poll for the result
  useEffect(() => {
    if (pages.length === 0 && story && !generating && !inflightRequests.current.has(1)) {
      // If no pages exist after 5 seconds, trigger generation
      // This handles cases where background generation from Questions failed
      const timer = setTimeout(() => {
        console.log('[Reader] No pages found, starting generation');
        generatePage(1, false);
      }, 5000); // Wait 5 seconds to allow background generation to complete
      return () => clearTimeout(timer);
    }
  }, [pages.length, story, generating, generatePage]);

  // Load existing life summary from character for cumulative memory
  useEffect(() => {
    if (story?.characters) {
      // The character's last_summary IS the cumulative life summary
      // We store it on the character, not on individual stories
      const characterDetails = story.characters as { last_summary?: string | null; pending_choice?: string | null };
      setExistingLifeSummary(characterDetails.pending_choice ? null : characterDetails.last_summary ?? null);
    }
  }, [story?.characters]);

  useEffect(() => {
    if (story && !story.characters?.hero_image_url) {
      setHasOpenedCover(true);
    }
  }, [story]);

  // Clear pending_choice after Page 1 loads successfully
  useEffect(() => {
    if (pages.length >= 1 && story?.characters?.pending_choice) {
      supabase
        .from('characters')
        .update({ pending_choice: null })
        .eq('id', story.characters.id)
        .then(({ error }) => {
          if (error) console.error('Failed to clear pending_choice:', error);
        });
    }
  }, [pages.length, story?.characters?.id, story?.characters?.pending_choice]);

  // Check if story is already ended and load saved options
  useEffect(() => {
    if (story && !story.is_active) {
      if (story.last_summary) {
        setAdventureSummary(story.last_summary);
      }
      if (story.generated_options && Array.isArray(story.generated_options)) {
        setNextOptions(story.generated_options as string[]);
      }
      if (story.themes && Array.isArray(story.themes)) {
        setStoryThemes(story.themes as string[]);
      }
    }
  }, [story]);

  // Background prefetch loop - SILENTLY stay 1-2 pages ahead (rolling window)
  // CRITICAL: This does NOT change currentPageIndex - user must tap to progress
  useEffect(() => {
    if (!story || !storyId) return;

    const targetPages = getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG');
    const isStoryEnded = !story.is_active || pages.length >= targetPages;

    // Prefetch the next page only (1 page ahead of current read position)
    const nextPageToFetch = pages.length + 1;
    // Prefetch if user is within 3 pages of needing it (more generous window)
    const shouldPrefetch = nextPageToFetch <= Math.min(currentPageIndex + 3, targetPages);

    console.log('[Reader] Prefetch check:', {
      currentPageIndex,
      pagesLength: pages.length,
      nextPageToFetch,
      shouldPrefetch,
      isStoryEnded,
      prefetchingNext,
      generating,
      targetPages
    });

    // Only prefetch if:
    // 1. Story is not ended
    // 2. We're not already prefetching or generating
    // 3. We have at least 1 page (story has started)
    // 4. Next page is within our prefetch window (user is close to needing it)
    // 5. Not already inflight
    if (
      !isStoryEnded &&
      !prefetchingNext &&
      !generating &&
      !prefetchInProgress.current &&
      pages.length > 0 &&
      shouldPrefetch &&
      !inflightRequests.current.has(nextPageToFetch)
    ) {
      console.log(`[Reader] Starting prefetch of page ${nextPageToFetch}`);
      // Small delay to let current render complete
      const timer = setTimeout(() => {
        generatePage(nextPageToFetch, true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pages.length, story, storyId, prefetchingNext, generating, generatePage, currentPageIndex]);

  const currentPage = pages[currentPageIndex];
  const configuredPages = story ? getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG') : 10;
  const configuredRange = story ? getPageRangeLabel(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG') : undefined;
  // Use actual page count if story is finished, otherwise show configured total range
  const isStoryFinished = story && !story.is_active;
  const totalPagesDisplay = isStoryFinished
    ? pages.length.toString()
    : configuredRange
      ? `around ${configuredRange}`
      : configuredPages.toString();
  const isLastPage = pages.length >= configuredPages || isStoryFinished;
  const canGoNext = currentPageIndex < pages.length - 1;
  const canGenerate = !isLastPage && currentPageIndex === pages.length - 1;
  const isOnFinalPage = isLastPage && currentPageIndex === pages.length - 1;
  const showCover = !!((heroPortrait.url || story?.characters?.hero_image_url) && !hasOpenedCover);
  const heroAvatarUrl = heroPortrait.url || story?.characters?.hero_image_url;
  const heroName = story?.characters?.name;
  // Questions are now only asked at the beginning of the story (before page 1)
  // No mid-story question interruptions
  const questionPages: number[] = [];

  // Only render SceneImage if there's actually an image URL stored
  const SceneImage = ({ imageUrl, pageNumber }: { imageUrl: string; pageNumber: number }) => {
    const { url, error, refresh, handleError, loading } = useSignedImageUrl({
      initialUrl: imageUrl,
      storyId: storyId ?? undefined,
      pageNumber,
    });
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Show skeleton while loading signed URL or image
    if (loading || (!imageLoaded && url && !imageError)) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="overflow-hidden rounded-xl shadow-lg"
        >
          <div className="aspect-[16/9] relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span
                className="text-sm text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Loading illustration...
              </motion.span>
            </div>
          </div>
        </motion.div>
      );
    }

    // Don't render anything if no URL or error
    if (!url || error || imageError) {
      return null;
    }

    return (
      <motion.div
        key={url}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-xl shadow-lg"
      >
        <div className="aspect-[16/9] bg-black/5 relative">
          <motion.img
            src={url}
            alt="Story scene"
            className="h-full w-full object-cover"
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.preventDefault();
              setImageError(true);
              handleError();
            }}
          />
        </div>
      </motion.div>
    );
  };

  const handleTapLeft = () => {
    if (currentPageIndex > 0) {
      setDirection(-1);
      setPageTransitioning(true);
      setCurrentPageIndex(currentPageIndex - 1);
      // Clear transition state after animation
      setTimeout(() => setPageTransitioning(false), 400);
    }
  };

  const handleTapRight = () => {
    // If there's a next page available, go to it
    if (canGoNext) {
      const nextIndex = currentPageIndex + 1;
      setDirection(1);
      setPageTransitioning(true);
      setCurrentPageIndex(nextIndex);
      // Clear transition state after animation
      setTimeout(() => setPageTransitioning(false), 400);
    }
    // If we're on the last available page but story isn't done, generate more
    else if (canGenerate && !generating) {
      const nextPage = pages.length + 1;
      setDirection(1);
      generatePage(nextPage, false).then(() => {
        // After generation, move to the new page
        setCurrentPageIndex(prev => prev + 1);
      });
    }
    // If we're on the final page of the story, show ending
    else if (isOnFinalPage) {
      setShowEnding(true);
    }
  };

  // Resume from bookmark or URL parameter
  useEffect(() => {
    if (!storyId || !story) return;
    
    const urlPage = searchParams.get('page');
    if (urlPage) {
      const pageIndex = Number(urlPage) - 1;
      if (!Number.isNaN(pageIndex) && pageIndex >= 0) {
        setCurrentPageIndex(pageIndex);
        return;
      }
    }

    // Resume from bookmark if available and no URL page specified
    if (hasBookmark && savedPage > 0 && pages.length > 0) {
      const bookmarkIndex = savedPage - 1; // Convert 1-based to 0-based
      // Only resume if bookmark is within available pages
      if (bookmarkIndex < pages.length) {
        setCurrentPageIndex(bookmarkIndex);
      }
    }
  }, [searchParams, storyId, story, hasBookmark, savedPage, pages.length]);

  // Show ending screen
  if (showEnding && story?.characters) {
    return (
      <SleepWellScreen
        characterName={story.characters.name}
        characterId={story.characters.id}
        storyId={storyId!}
        adventureSummary={adventureSummary}
        existingLifeSummary={existingLifeSummary}
        storyThemes={storyThemes}
        onStartNextStory={() => navigate(`/questions/${story.characters.id}`)}
      />
    );
  }

  if (showCover && story) {
    const characterDetails = story.characters as { hero_image_url?: string | null };
    return (
      <CoverPage
        title={story.title || `${story.characters.name}'s avontuur`}
        heroImageUrl={heroPortrait.url || characterDetails.hero_image_url}
        onOpen={() => setHasOpenedCover(true)}
        lengthSetting={story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG'}
      />
    );
  }

  return (
    <div ref={ref} className={`h-screen paper-texture flex flex-col overflow-hidden ${activeTheme.background} ${activeTheme.text}`}>
      {/* Header */}
      <header className="flex-shrink-0 p-4 flex justify-between items-center z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to dashboard"
            >
              <Home className="w-5 h-5" />
            </Button>
          </motion.div>
          <Avatar className="h-10 w-10 ring-2 ring-white/40 shadow-sm">
            <AvatarImage src={heroAvatarUrl || undefined} alt={heroName ? `${heroName} portrait` : 'Hero portrait'} />
            <AvatarFallback className="text-xs font-semibold">
              {heroName ? heroName.slice(0, 2).toUpperCase() : <UserCircle className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-2">
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
                  aria-label={t('readerThemeLabel', { theme: option.label })}
                >
                  <Icon className="w-4 h-4" />
                  <span className="ml-1 hidden md:inline">{option.label}</span>
                </Button>
              );
            })}
          </div>

          {/* Prefetching indicator - just a subtle dot, no text */}
          {prefetchingNext && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center"
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-primary/50"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.div>
          )}
        </div>
      </header>

      {/* Reading area */}
      <main id="main-content" className="flex-1 overflow-y-hidden px-6 pb-12">
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
            {pages.length === 0 ? (
              // Initial loading state - show skeleton while waiting for first page
              <motion.div
                key="initial-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <MoonStar className="w-8 h-8 text-primary" />
                  </motion.div>
                  <p className={`font-serif text-center ${activeTheme.muted}`}>
                    It takes a few seconds to generate your story, please hold on
                  </p>
                </div>
              </motion.div>
            ) : (generating || generationError) && currentPageIndex === pages.length - 1 ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`text-center py-20 ${activeTheme.muted}`}
              >
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <MoonStar className="w-8 h-8 text-primary" />
                  </motion.div>
                  <p className="font-serif">Writing...</p>
                </div>
              </motion.div>
            ) : currentPage ? (
              <motion.div
                key={currentPage.id}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  rotateY: { duration: 0.3 },
                }}
                className={`story-text text-lg leading-relaxed py-4 space-y-6 ${activeTheme.text} relative`}
              >
                {/* Show subtle loading overlay during transitions */}
                {pageTransitioning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-sm rounded-lg z-10"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <MoonStar className="w-4 h-4 text-primary" />
                    </motion.div>
                  </motion.div>
                )}
                {currentPage.image_url && <SceneImage imageUrl={currentPage.image_url} pageNumber={currentPage.page_number || currentPageIndex + 1} />}
                <div className="whitespace-pre-line">{currentPage.content}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Page navigation footer - minimal */}
          <div className="mt-8 pb-8 flex flex-col items-center gap-4">
            {generating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm">{t('generating') || 'Writing...'}</span>
              </motion.div>
            )}

            {isOnFinalPage && !generating && (
              <Button
                onClick={() => setShowEnding(true)}
                size="lg"
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              >
                <MoonStar className="w-5 h-5" />
                {t('finishStory') || 'Finish Story'}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Navigation arrows - visible navigation controls */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none" style={{ top: '64px', bottom: '160px' }}>
        {/* Previous page button */}
        {currentPageIndex > 0 && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border transition-all ${
              activeTheme.background === 'bg-white'
                ? 'bg-white/90 border-gray-200 hover:bg-white'
                : activeTheme.background === 'bg-[#f5e6c9]'
                ? 'bg-[#f5e6c9]/90 border-[#d4c5a9] hover:bg-[#f5e6c9]'
                : 'bg-[#1f2933]/90 border-white/10 hover:bg-[#1f2933]'
            }`}
            onClick={handleTapLeft}
            aria-label={t('readerPreviousPage')}
          >
            <ChevronLeft className={`w-6 h-6 ${activeTheme.text}`} />
          </motion.button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Next page button */}
        {(canGoNext || canGenerate) && !isOnFinalPage && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`pointer-events-auto w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md border transition-all ${
              activeTheme.background === 'bg-white'
                ? 'bg-white/90 border-gray-200 hover:bg-white'
                : activeTheme.background === 'bg-[#f5e6c9]'
                ? 'bg-[#f5e6c9]/90 border-[#d4c5a9] hover:bg-[#f5e6c9]'
                : 'bg-[#1f2933]/90 border-white/10 hover:bg-[#1f2933]'
            }`}
            onClick={handleTapRight}
            aria-label={t('readerNextPage')}
            disabled={generating}
          >
            <ChevronRight className={`w-6 h-6 ${activeTheme.text}`} />
          </motion.button>
        )}
      </div>

    </div>
  );
});

export default Reader;
