import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDemoHero, buildDemoRoute } from '@/lib/demoStorage';
import { generateDemoStory } from '@/lib/demoStoryTemplate';
import Reader from '@/components/Reader';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { DemoStoryRecord } from '@/lib/demoStoryTemplate';

export default function DemoReader() {
  const navigate = useNavigate();
  const [story, setStory] = useState<DemoStoryRecord | null>(null);
  const [heroName, setHeroName] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState(false);

  // Get hero data once on mount
  const hero = useMemo(() => getDemoHero(), []);

  useEffect(() => {
    // If no hero exists, redirect to hero creation
    if (!hero) {
      navigate(buildDemoRoute('/demo-hero'));
      return;
    }

    // Generate story immediately
    const generateStory = async () => {
      setIsGenerating(true);
      setError(false);

      try {
        // Small delay to show loading state (better UX)
        await new Promise(resolve => setTimeout(resolve, 500));

        const generatedStory = generateDemoStory(hero);

        if (!generatedStory || !generatedStory.pages || generatedStory.pages.length === 0) {
          throw new Error('Story generation failed');
        }

        setStory(generatedStory);
        setHeroName(hero.heroName);
      } catch (err) {
        console.error('Failed to generate demo story:', err);
        setError(true);
      } finally {
        setIsGenerating(false);
      }
    };

    generateStory();
  }, [hero, navigate]);

  // Loading state
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-background paper-texture flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center max-w-md"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl text-foreground">
              Creating your story...
            </h2>
            <p className="text-muted-foreground">
              {heroName || 'Your hero'} is about to embark on a magical adventure
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background paper-texture flex items-center justify-center px-6">
        <div className="text-center max-w-md space-y-4">
          <h2 className="font-serif text-2xl text-foreground">
            Oops! Something went wrong
          </h2>
          <p className="text-muted-foreground">
            We couldn't generate your demo story. Please try again.
          </p>
          <button
            onClick={() => navigate(buildDemoRoute('/demo-hero'))}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Story ready - render Reader
  if (!story) {
    return null;
  }

  return <Reader story={story} heroName={heroName} isDemo={true} />;
}
