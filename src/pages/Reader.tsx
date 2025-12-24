import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Home, Moon, Zap, Meh, Smile, MoonStar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTotalPages } from '@/lib/storyEngine';
import { toast } from 'sonner';
import SleepWellScreen from '@/components/SleepWellScreen';

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
  const [mood, setMood] = useState(50);
  const [humor, setHumor] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [direction, setDirection] = useState(0);
  const [adventureSummary, setAdventureSummary] = useState<string | undefined>();
  const [nextOptions, setNextOptions] = useState<string[] | undefined>();
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
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!storyId) return;
      setGenerating(true);
      
      const moodSetting = mood > 50 ? 'exciting' : 'calm';
      const humorSetting = humor > 50 ? 'funny' : 'serious';

      const { data, error } = await supabase.functions.invoke('generate-page', {
        body: { 
          storyId, 
          mood: moodSetting, 
          humor: humorSetting 
        },
      });

      setGenerating(false);

      if (error) {
        console.error('Generation error:', error);
        toast.error("The story magic is taking a short nap. Try again in a moment.");
        return null;
      }

      if (data?.fallback) {
        toast.error(data.page_text || "The story magic is taking a short nap. Try again in a moment.");
        return null;
      }

      if (data?.is_ending) {
        if (data?.adventure_summary) {
          setAdventureSummary(data.adventure_summary);
        }
        if (data?.next_options) {
          setNextOptions(data.next_options);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
      
      // If this was the ending page, show the ending screen after a brief delay
      if (data?.is_ending) {
        setTimeout(() => {
          setShowEnding(true);
        }, 2000);
      }
    },
  });

  useEffect(() => {
    if (pages.length === 0 && story && !generating) {
      generateMutation.mutate();
    }
  }, [pages.length, story]);

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
      generateMutation.mutate();
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
        
        <Sheet>
          <SheetTrigger asChild>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </motion.div>
          </SheetTrigger>
          <SheetContent className="glass">
            <SheetHeader>
              <SheetTitle className="font-serif">Director Mode</SheetTitle>
            </SheetHeader>
            <div className="space-y-8 mt-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Moon className="w-4 h-4" /> Calm
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Exciting <Zap className="w-4 h-4" />
                  </div>
                </div>
                <Slider value={[mood]} onValueChange={([v]) => setMood(v)} max={100} step={1} />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Affects the next generated page
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Meh className="w-4 h-4" /> Serious
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Funny <Smile className="w-4 h-4" />
                  </div>
                </div>
                <Slider value={[humor]} onValueChange={([v]) => setHumor(v)} max={100} step={1} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
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
            {generating ? (
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
                  <p className="font-serif">Weaving the story...</p>
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
