import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MoonStar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTotalPages } from '@/lib/storyEngine';
import { toast } from 'sonner';
import SleepWellScreen from '@/components/SleepWellScreen';
import SkeletonLoader from '@/components/SkeletonLoader';

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

export default function Reader() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [direction, setDirection] = useState(0);
  const [adventureSummary, setAdventureSummary] = useState<string | undefined>();
  const [nextOptions, setNextOptions] = useState<string[] | undefined>();
  const [prefetchingNext, setPrefetchingNext] = useState(false);
  const lastPrefetchedPage = useRef(0);

  const { data: story } = useQuery({
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

  const { data: pages = [] } = useQuery({
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
    refetchInterval: prefetchingNext ? 1000 : false,
  });

  // Generate page mutation (no mood/humor - simplified)
  const generatePage = useCallback(async (isBackground = false) => {
    if (!storyId) return null;
    
    if (!isBackground) setGenerating(true);
    else setPrefetchingNext(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-page', {
        body: { storyId },
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

      // Track which page we just generated
      if (data?.page_number) {
        lastPrefetchedPage.current = data.page_number;
      }

      if (data?.is_ending) {
        if (data?.adventure_summary) {
          setAdventureSummary(data.adventure_summary);
        }
        if (data?.next_options) {
          setNextOptions(data.next_options);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['pages', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });

      return data;
    } finally {
      if (!isBackground) setGenerating(false);
      else setPrefetchingNext(false);
    }
  }, [storyId, queryClient]);

  // Initial page generation
  useEffect(() => {
    if (pages.length === 0 && story && !generating) {
      generatePage(false);
    }
  }, [pages.length, story, generating, generatePage]);

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

  // Set current page to latest when pages update
  useEffect(() => {
    if (pages.length > 0) {
      setCurrentPageIndex(pages.length - 1);
    }
  }, [pages.length]);

  // Check if story is already ended and load saved options
  useEffect(() => {
    if (story && !story.is_active) {
      if (story.last_summary) {
        setAdventureSummary(story.last_summary);
      }
      if (story.generated_options && Array.isArray(story.generated_options)) {
        setNextOptions(story.generated_options as string[]);
      }
    }
  }, [story]);

  // Background prefetch loop - always stay one page ahead
  useEffect(() => {
    if (!story || !storyId) return;
    
    const targetPages = getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG');
    const isStoryEnded = !story.is_active || pages.length >= targetPages;
    
    // Only prefetch if:
    // 1. Story is not ended
    // 2. We're not already prefetching
    // 3. We haven't already prefetched beyond current pages
    // 4. We have at least 1 page (so story has started)
    if (
      !isStoryEnded && 
      !prefetchingNext && 
      !generating &&
      pages.length > 0 && 
      lastPrefetchedPage.current <= pages.length
    ) {
      // Trigger background fetch for next page
      generatePage(true);
    }
  }, [pages.length, story, storyId, prefetchingNext, generating, generatePage]);

  const currentPage = pages[currentPageIndex];
  const totalPages = story ? getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG') : 10;
  const isLastPage = pages.length >= totalPages || (story && !story.is_active);
  const canGoNext = currentPageIndex < pages.length - 1;
  const canGenerate = !isLastPage && currentPageIndex === pages.length - 1;
  const isOnFinalPage = isLastPage && currentPageIndex === pages.length - 1;

  const handleTapLeft = () => {
    if (currentPageIndex > 0) {
      setDirection(-1);
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleTapRight = () => {
    if (canGoNext) {
      setDirection(1);
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (canGenerate && !generating) {
      setDirection(1);
      generatePage(false);
    } else if (isOnFinalPage) {
      setShowEnding(true);
    }
  };

  // Show ending screen
  if (showEnding && story?.characters) {
    return (
      <SleepWellScreen 
        characterName={story.characters.name}
        characterId={story.characters.id}
        adventureSummary={adventureSummary}
        nextOptions={nextOptions}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <Home className="w-5 h-5" />
          </Button>
        </motion.div>
        
        {/* Prefetching indicator */}
        {prefetchingNext && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-primary/50"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="hidden sm:inline">Preparing next page...</span>
          </motion.div>
        )}
      </header>

      {/* Reading area */}
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full" style={{ perspective: '1000px' }}>
          {story?.title && currentPageIndex === 0 && (
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif text-2xl text-center text-foreground mb-8"
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
            ) : generating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground"
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
                className="story-text text-lg leading-relaxed"
              >
                {currentPage.content}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Tap to continue hint on final page */}
          {isOnFinalPage && !generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center mt-8"
            >
              <motion.p 
                className="text-sm text-muted-foreground"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Tap to continue...
              </motion.p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Navigation touch areas */}
      <div className="absolute inset-0 flex pointer-events-none">
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

      {/* Page indicator */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <motion.span 
          key={currentPageIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground font-medium"
        >
          Page {currentPageIndex + 1} of {totalPages}
        </motion.span>
      </footer>
    </div>
  );
}
