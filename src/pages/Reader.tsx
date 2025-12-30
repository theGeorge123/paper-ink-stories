import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MoonStar, Sun, Sunrise, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTotalPages } from '@/lib/storyEngine';
import { toast } from 'sonner';
import SleepWellScreen from '@/components/SleepWellScreen';
import SkeletonLoader from '@/components/SkeletonLoader';
import CoverPage from '@/components/CoverPage';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';

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

export default function Reader() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
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

  // Generate page mutation with deduplication
  const generatePage = useCallback(async (targetPageNumber: number, isBackground = false) => {
    if (!storyId) return null;
    
    // Prevent duplicate inflight requests for same page
    if (inflightRequests.current.has(targetPageNumber)) {
      console.log(`Page ${targetPageNumber} already inflight, skipping`);
      return null;
    }
    
    inflightRequests.current.add(targetPageNumber);
    
    if (!isBackground) setGenerating(true);
    else {
      setPrefetchingNext(true);
      prefetchInProgress.current = true;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-page', {
        body: { storyId, targetPage: targetPageNumber },
      });

      if (error) {
        console.error('Generation error:', error);
        if (!isBackground) {
          toast.error("The story magic is taking a short nap. Try again in a moment.");
        }
        return null;
      }

      if (data?.fallback) {
        if (!isBackground) {
          toast.error(data.page_text || "The story magic is taking a short nap. Try again in a moment.");
        }
        return null;
      }

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

      return data;
    } finally {
      inflightRequests.current.delete(targetPageNumber);
      if (!isBackground) setGenerating(false);
      else {
        setPrefetchingNext(false);
        prefetchInProgress.current = false;
      }
    }
  }, [storyId, refetchPages, refetchStory]);

  // Initial page generation - only when no pages exist (Page 1 should already be generated)
  useEffect(() => {
    if (pages.length === 0 && story && !generating && !inflightRequests.current.has(1)) {
      generatePage(1, false);
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
  // CRITICAL: This does NOT change currentPageIndex
  useEffect(() => {
    if (!story || !storyId) return;
    
    const targetPages = getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG');
    const isStoryEnded = !story.is_active || pages.length >= targetPages;
    
    // Prefetch up to 2 pages ahead of current position
    const nextPageToFetch = pages.length + 1;
    const maxPrefetch = Math.min(currentPageIndex + 3, targetPages); // 2 pages ahead of current view
    
    // Only prefetch if:
    // 1. Story is not ended
    // 2. We're not already prefetching or generating
    // 3. We have at least 1 page (story has started)
    // 4. Next page is within our prefetch window
    // 5. Not already inflight
    if (
      !isStoryEnded && 
      !prefetchingNext && 
      !generating &&
      !prefetchInProgress.current &&
      pages.length > 0 && 
      nextPageToFetch <= maxPrefetch &&
      !inflightRequests.current.has(nextPageToFetch)
    ) {
      // Small delay to let current render complete
      const timer = setTimeout(() => {
        generatePage(nextPageToFetch, true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [pages.length, story, storyId, prefetchingNext, generating, generatePage, currentPageIndex]);

  const currentPage = pages[currentPageIndex];
  const totalPages = story ? getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG') : 10;
  const isLastPage = pages.length >= totalPages || (story && !story.is_active);
  const canGoNext = currentPageIndex < pages.length - 1;
  const canGenerate = !isLastPage && currentPageIndex === pages.length - 1;
  const isOnFinalPage = isLastPage && currentPageIndex === pages.length - 1;
  const showCover = !!((heroPortrait.url || story?.characters?.hero_image_url) && !hasOpenedCover);

  const SceneImage = ({ imageUrl, pageNumber }: { imageUrl?: string | null; pageNumber: number }) => {
    const { url, error, refresh, handleError, loading } = useSignedImageUrl({
      initialUrl: imageUrl,
      storyId: storyId ?? undefined,
      pageNumber,
    });
    const [imageLoaded, setImageLoaded] = useState(false);

    // Show skeleton while loading
    if (loading || (!url && !error)) {
      return (
        <div className="overflow-hidden rounded-xl shadow-lg">
          <div className="aspect-[16/9] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-sm">Creating illustration...</span>
              </motion.div>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="overflow-hidden rounded-xl shadow-lg">
          <div className="aspect-[16/9] bg-black/5 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Illustration unavailable</span>
            <Button variant="outline" size="sm" onClick={refresh}>
              Retry
            </Button>
          </div>
        </div>
      );
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
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
          )}
          <motion.img
            src={url!}
            alt="Story scene"
            className="h-full w-full object-cover"
            initial={{ scale: 1.02, opacity: 0 }}
            animate={{ scale: 1, opacity: imageLoaded ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              e.preventDefault();
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
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleTapRight = () => {
    // If there's a next page available, go to it
    if (canGoNext) {
      setDirection(1);
      setCurrentPageIndex(currentPageIndex + 1);
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

  // Show ending screen
  if (showEnding && story?.characters) {
    return (
      <SleepWellScreen
        characterName={story.characters.name}
        characterId={story.characters.id}
        storyId={storyId!}
        adventureSummary={adventureSummary}
        nextOptions={nextOptions}
        existingLifeSummary={existingLifeSummary}
        storyThemes={storyThemes}
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
      />
    );
  }

  return (
    <div className={`h-screen paper-texture flex flex-col overflow-hidden ${activeTheme.background} ${activeTheme.text}`}>
      {/* Header */}
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

      {/* Scrollable reading area */}
      <main className="flex-1 overflow-y-auto px-6 pb-28">
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
            {generating && pages.length === 0 ? (
              <motion.div
                key="loading-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SkeletonLoader type="reader" />
              </motion.div>
            ) : generating && currentPageIndex === pages.length - 1 ? (
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
                className={`story-text text-lg leading-relaxed py-4 space-y-6 ${activeTheme.text}`}
              >
                {(currentPage as any).image_url && <SceneImage imageUrl={(currentPage as any).image_url} pageNumber={currentPage.page_number || currentPageIndex + 1} />}
                <div className="whitespace-pre-line">{currentPage.content}</div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Tap to continue hint on final page */}
          {isOnFinalPage && !generating && (
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
                Tap to continue...
              </motion.p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Navigation touch areas - overlay */}
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

      {/* Fixed page indicator footer - OUTSIDE scrollable area */}
      <footer className={`fixed bottom-0 left-0 right-0 p-4 text-center border-t border-border/50 backdrop-blur-md ${activeTheme.footer}`}>
        <motion.span
          key={currentPageIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-medium ${activeTheme.muted}`}
        >
          Page {currentPageIndex + 1} of {totalPages}
        </motion.span>
      </footer>
    </div>
  );
}
