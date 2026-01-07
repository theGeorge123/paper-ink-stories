import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Sun, Sunrise, Moon, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { buildDemoRoute, clearDemoId, fetchDemoSession, getDemoIdFromCookie } from '@/lib/demoStorage';
import { trackDemoEvent } from '@/lib/performance';
import { toast } from 'sonner';

// Page turn animation variants - same as Reader.tsx
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

// Same themes as the real Reader
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

const buildDemoPages = (text: string, paragraphsPerPage = 2) => {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [text];
  }

  const pages: string[] = [];
  for (let i = 0; i < paragraphs.length; i += paragraphsPerPage) {
    pages.push(paragraphs.slice(i, i + paragraphsPerPage).join('\n\n'));
  }

  return pages;
};

export default function DemoReader() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const demoId = useMemo(() => getDemoIdFromCookie(), []);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>('day');
  const [showEndScreen, setShowEndScreen] = useState(false);
  const [pages, setPages] = useState<string[]>([]);
  const [storyTitle, setStoryTitle] = useState('');
  const [heroName, setHeroName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!demoId) {
      setLoading(false);
      navigate(buildDemoRoute('/demo-hero'));
      return;
    }

    const loadStory = async () => {
      try {
        const session = await fetchDemoSession(demoId);

        if (!session.hero || !session.lastEpisode) {
          if (!session.hero) {
            navigate(buildDemoRoute('/demo-hero'));
          } else {
            navigate(buildDemoRoute('/demo-questions'));
          }
          return;
        }

        setHeroName(session.hero.heroName);
        setStoryTitle(`${session.hero.heroName}'s Bedtime Story`);
        setPages(buildDemoPages(session.lastEpisode.storyText));
        trackDemoEvent('demo_reader_loaded', { demoId, episodeId: session.lastEpisode.id });
      } catch (error) {
        console.error('[DemoReader] Failed to load demo story', error);
        trackDemoEvent('demo_reader_load_failed', {
          demoId,
          message: error instanceof Error ? error.message : String(error),
        });
        setLoadError('Unable to load the demo story. Please check your connection and retry.');
        toast.error('Unable to load the demo story. Please try again.');
        clearDemoId();
      } finally {
        setLoading(false);
      }
    };

    loadStory();
  }, [demoId, navigate]);

  useEffect(() => {
    if (showEndScreen) {
      trackDemoEvent('demo_completed', { demoId });
    }
  }, [demoId, showEndScreen]);

  const activeTheme = themes[theme];
  const currentPage = pages[currentPageIndex] ?? '';
  const isLastPage = pages.length > 0 && currentPageIndex === pages.length - 1;
  const isFirstPage = currentPageIndex === 0;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background paper-texture flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-primary"
        >
          <Sparkles className="w-8 h-8" />
        </motion.div>
      </div>
    );
  }

  if (loadError) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-background paper-texture flex items-center justify-center px-6"
      >
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-serif font-semibold text-foreground">We hit a snag.</h1>
          <p className="text-muted-foreground">{loadError}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate(buildDemoRoute('/demo-reader'))}>Retry</Button>
            <Button variant="ghost" onClick={() => navigate(buildDemoRoute('/demo-hero'))}>
              Back to demo setup
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!demoId) {
    return null;
  }

  // End screen - same style as SleepWellScreen
  if (showEndScreen) {
    return (
      <div
        id="main-content"
        className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center p-6 text-center"
      >
        {/* Stars background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md"
        >
          <div className="mb-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4"
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="font-serif text-3xl text-white mb-2">{t('theEnd')}</h1>
            <p className="text-white/70">
              {heroName ? `${heroName}'s story is ready for another cozy night.` : 'Your demo adventure is complete.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
            <p className="text-white/80 text-sm mb-4">
              Create your own personalized characters and unlock infinite bedtime adventures that grow with your child.
            </p>
            <Button
              onClick={() => {
                clearDemoId();
                navigate("/auth");
              }}
              size="lg"
              className="w-full mb-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('createFreeAccount')}
            </Button>
            <Button
              onClick={() => navigate(buildDemoRoute('/demo-questions'))}
              variant="ghost"
              className="w-full text-white/70 hover:text-white"
            >
              Generate another demo story
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`h-screen paper-texture flex flex-col overflow-hidden ${activeTheme.background} ${activeTheme.text}`}>
      {/* Header - same as real Reader */}
      <header className="flex-shrink-0 p-4 flex justify-between items-center z-10 backdrop-blur-sm">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back to home">
            <Home className="w-5 h-5" />
          </Button>
        </motion.div>

        <div className="flex items-center gap-3">
          {/* Demo badge */}
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">{t('demoStoryLabel')}</span>
          </div>

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
        </div>
      </header>

      {/* Scrollable reading area - same as real Reader */}
      <main id="main-content" className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="max-w-xl mx-auto" style={{ perspective: '1000px' }}>
          {currentPageIndex === 0 && (
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`font-serif text-2xl text-center mb-8 pt-4 ${activeTheme.text}`}
            >
              {storyTitle}
            </motion.h1>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.article
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
              className="prose prose-lg max-w-none"
            >
              <div className={`space-y-6 font-serif text-xl leading-relaxed ${activeTheme.text}`}>
                {currentPage.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="first-letter:text-3xl first-letter:font-bold first-letter:mr-1">
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </main>

      {/* Navigation footer - same as real Reader */}
      <footer className={`flex-shrink-0 ${activeTheme.footer} border-t border-black/5 backdrop-blur-sm`}>
        <div className="relative h-20">
          {/* Page indicator */}
          <div className={`absolute top-3 left-1/2 -translate-x-1/2 text-sm ${activeTheme.muted}`}>
            Page {pages.length > 0 ? currentPageIndex + 1 : 0} of {pages.length}
          </div>

          {/* Tap zones */}
          <div className="absolute inset-0 flex">
            <button
              onClick={handleTapLeft}
              disabled={isFirstPage}
              className="flex-1 flex items-center justify-center touch-manipulation disabled:opacity-30"
              aria-label={t('readerPreviousPage')}
            >
              <ChevronLeft className={`w-8 h-8 ${activeTheme.muted}`} />
            </button>
            <button
              onClick={handleTapRight}
              className="flex-1 flex items-center justify-center touch-manipulation"
              aria-label={isLastPage ? t('readerFinishStory') : t('readerNextPage')}
            >
              <ChevronRight className={`w-8 h-8 ${activeTheme.muted}`} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
