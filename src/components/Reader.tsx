import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Sun, Sunrise, Moon, Sparkles, MoonStar, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/hooks/useLanguage';
import { buildDemoRoute, clearDemoId, getDemoIdFromCookie } from '@/lib/demoStorage';
import { trackDemoEvent } from '@/lib/performance';
import type { DemoStoryRecord } from '@/lib/demoStoryTemplate';
import CoverPage from '@/components/CoverPage';

type ThemeKey = 'day' | 'sepia' | 'night';

interface ReaderProps {
  story: DemoStoryRecord;
  heroName?: string | null;
  isDemo?: boolean;
  heroImageUrl?: string | null;
}

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
  },
} as const;

const themeOptions = [
  { key: 'day', label: 'Day', icon: Sun },
  { key: 'sepia', label: 'Sepia', icon: Sunrise },
  { key: 'night', label: 'Night', icon: Moon },
] as const;

export default function Reader({ story, heroName, isDemo = false, heroImageUrl }: ReaderProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const demoId = useMemo(() => getDemoIdFromCookie(), []);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>('day');
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [hasOpenedCover, setHasOpenedCover] = useState(false);

  useEffect(() => {
    setPages(story.pages);
    setCurrentPageIndex(0);
    setShowEndScreen(false);
    // Show cover page if hero image exists, otherwise skip it
    setHasOpenedCover(!heroImageUrl);
    if (demoId) {
      trackDemoEvent('demo_reader_loaded', { demoId });
    }
  }, [demoId, story, heroImageUrl]);

  useEffect(() => {
    if (showEndScreen && demoId) {
      trackDemoEvent('demo_completed', { demoId });
    }
  }, [demoId, showEndScreen]);

  const activeTheme = themes[theme];
  const currentPage = pages[currentPageIndex] ?? '';
  const isLastPage = pages.length > 0 && currentPageIndex === pages.length - 1;
  const isFirstPage = currentPageIndex === 0;
  const showCover = !!heroImageUrl && !hasOpenedCover;

  // Generate stable star positions once
  const starPositions = useMemo(() => 
    [...Array(30)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 2,
    })), []
  );

  const handleTapLeft = () => {
    if (!isFirstPage) {
      setDirection(-1);
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleTapRight = () => {
    if (!isLastPage) {
      setDirection(1);
      setCurrentPageIndex(currentPageIndex + 1);
    } else {
      setShowEndScreen(true);
    }
  };

  // Show cover page before story content
  if (showCover) {
    return (
      <CoverPage
        title={story.title}
        heroImageUrl={heroImageUrl}
        onOpen={() => setHasOpenedCover(true)}
      />
    );
  }

  // End screen - matches SleepWellScreen styling
  if (showEndScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto"
        style={{ background: 'linear-gradient(180deg, #1A202C 0%, #2D3748 100%)' }}
      >
        {/* Stars decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {starPositions.map((star, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ 
                duration: star.duration, 
                repeat: Infinity, 
                delay: star.delay 
              }}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: star.left,
                top: star.top,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-md w-full flex flex-col items-center">
          {/* Moon icon */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
            className="mb-6"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)]">
              <MoonStar className="w-10 h-10 text-amber-900" />
            </div>
          </motion.div>

          {/* The End text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="font-serif text-4xl text-white mb-2 text-center"
          >
            {t('theEnd')}
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-lg text-white/70 mb-8 text-center"
          >
            {t('sleepWell')}, little one
          </motion.p>

          {/* Demo CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full mb-6 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <p className="text-white/80 text-sm text-center mb-4">
              {isDemo
                ? "Loved this story? Create personalized adventures with YOUR child's name and favorite things!"
                : "Create your own personalized characters and unlock infinite bedtime adventures."}
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="flex flex-col gap-3 w-full"
          >
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => {
                  clearDemoId();
                  navigate('/auth');
                }}
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
              >
                <Sparkles className="w-5 h-5" />
                {t('createFreeAccount')}
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => navigate(buildDemoRoute('/demo-hero'))}
                size="lg"
                variant="outline"
                className="w-full gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Sparkles className="w-5 h-5" />
                Create a new hero
              </Button>
            </motion.div>

            <Button
              onClick={() => navigate('/')}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Back to home
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`h-screen paper-texture flex flex-col overflow-hidden ${activeTheme.background} ${activeTheme.text}`}>
      {/* Header - matches logged-in reader */}
      <header className="flex-shrink-0 p-4 flex justify-between items-center z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Back to home"
            >
              <Home className="w-5 h-5" />
            </Button>
          </motion.div>
          <Avatar className="h-10 w-10 ring-2 ring-white/40 shadow-sm">
            <AvatarImage src={heroImageUrl || undefined} alt="Hero portrait" />
            <AvatarFallback className="text-xs font-semibold">
              <UserCircle className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex items-center gap-2">
          {isDemo && (
            <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">{t('demoStoryLabel')}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/10 bg-black/5 px-2 py-1 backdrop-blur-md">
            {themeOptions.map((option) => {
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
        </div>
      </header>

      {/* Scrollable reading area */}
      <main id="main-content" className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="max-w-xl mx-auto" style={{ perspective: '1000px' }}>
          {story.title && currentPageIndex === 0 && (
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-serif text-2xl text-center mb-8 pt-4 ${activeTheme.text}`}
            >
              {story.title}
            </motion.h1>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPageIndex}
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
              className={`story-text text-lg leading-relaxed py-4 space-y-6 ${activeTheme.text}`}
            >
              <div className="whitespace-pre-line">
                {currentPage.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="first-letter:text-3xl first-letter:font-bold first-letter:mr-1 mb-6">
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Tap to continue hint on final page */}
          {isLastPage && (
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

      {/* Navigation touch areas - overlay */}
      <div className="absolute inset-0 flex pointer-events-none" style={{ top: '64px', bottom: '96px' }}>
        <button
          className="w-1/3 h-full pointer-events-auto active:bg-black/5 transition-colors"
          onClick={handleTapLeft}
          aria-label={t('readerPreviousPage')}
        />
        <div className="w-1/3" />
        <button
          className="w-1/3 h-full pointer-events-auto active:bg-black/5 transition-colors"
          onClick={handleTapRight}
          aria-label={isLastPage ? t('readerFinishStory') : t('readerNextPage')}
        />
      </div>
    </div>
  );
}
