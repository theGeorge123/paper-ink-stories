import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, Home, Moon, Zap, Meh, Smile, MoonStar, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTotalPages } from '@/lib/storyEngine';
import { toast } from 'sonner';

export default function Reader() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [mood, setMood] = useState(50);
  const [humor, setHumor] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

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
        setIsEnding(true);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', storyId] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
    },
  });

  useEffect(() => {
    if (pages.length === 0 && story && !generating) {
      generateMutation.mutate();
    }
  }, [pages.length, story]);

  useEffect(() => {
    setCurrentPageIndex(Math.max(0, pages.length - 1));
  }, [pages.length]);

  // Check if story is already ended
  useEffect(() => {
    if (story && !story.is_active) {
      setIsEnding(true);
    }
  }, [story]);

  const currentPage = pages[currentPageIndex];
  const totalPages = story ? getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG') : 10;
  const isLastPage = pages.length >= totalPages || isEnding;
  const canGoNext = currentPageIndex < pages.length - 1;
  const canGenerate = !isLastPage && currentPageIndex === pages.length - 1;
  const showEndButtons = isEnding && currentPageIndex === pages.length - 1;

  const handleTapRight = () => {
    if (canGoNext) {
      setCurrentPageIndex(currentPageIndex + 1);
    } else if (canGenerate && !generating) {
      generateMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background paper-texture flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <Home className="w-5 h-5" />
        </Button>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
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
        <div className="max-w-xl w-full">
          {story?.title && currentPageIndex === 0 && (
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif text-2xl text-center text-foreground mb-8"
            >
              {story.title}
            </motion.h1>
          )}

          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <MoonStar className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-serif">Weaving the story...</p>
                </div>
              </motion.div>
            ) : currentPage ? (
              <motion.div
                key={currentPage.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="story-text text-lg leading-relaxed"
              >
                {currentPage.content}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* End screen */}
          {showEndButtons && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-12 space-y-6"
            >
              <div className="space-y-2">
                <p className="font-serif text-2xl text-primary">The End</p>
                <p className="text-muted-foreground text-sm">Sweet dreams await...</p>
              </div>
              
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                >
                  <MoonStar className="w-4 h-4" />
                  Goodnight
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="ghost"
                  size="sm"
                  className="w-full gap-2"
                >
                  <Library className="w-4 h-4" />
                  Back to Library
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Navigation - only show when not on end screen */}
      {!showEndButtons && (
        <div className="absolute inset-0 flex pointer-events-none">
          <button
            className="w-1/3 h-full pointer-events-auto"
            onClick={() => currentPageIndex > 0 && setCurrentPageIndex(currentPageIndex - 1)}
          />
          <div className="w-1/3" />
          <button
            className="w-1/3 h-full pointer-events-auto"
            onClick={handleTapRight}
          />
        </div>
      )}

      {/* Page indicator */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <span className="text-sm text-muted-foreground">
          Page {currentPageIndex + 1} of {totalPages}
        </span>
      </footer>
    </div>
  );
}
