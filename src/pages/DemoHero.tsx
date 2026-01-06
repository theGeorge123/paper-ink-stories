import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Play, ChevronRight, Home, Heart, Cat, Rabbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { DEMO_CHARACTER } from '@/data/demoStory';

const SIDEKICK_ICONS: Record<string, React.ElementType> = {
  owl: Cat,
  bunny: Rabbit,
};

export default function DemoHero() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background paper-texture flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <Home className="w-5 h-5" />
        </Button>
        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-primary">{t('demoStoryLabel')}</span>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center"
        >
          {/* Demo hero title */}
          <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
            Meet Your Demo Hero
          </h1>
          <p className="text-muted-foreground mb-8">
            Experience a bedtime story with Luna
          </p>

          {/* Hero card - same style as real character cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="book-cover p-6 mb-8"
          >
            {/* Hero portrait placeholder */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-fuchsia-100 to-fuchsia-200/50 border-2 border-background shadow-lg flex items-center justify-center mb-4"
            >
              <Sparkles className="w-12 h-12 text-fuchsia-600" />
            </motion.div>

            {/* Character info */}
            <h2 className="font-serif text-xl text-foreground mb-1">
              {DEMO_CHARACTER.name}
            </h2>
            <p className="text-sm text-muted-foreground capitalize font-medium mb-2">
              The {DEMO_CHARACTER.archetype}
            </p>

            {DEMO_CHARACTER.sidekick_name && (
              <p className="text-xs text-muted-foreground/80 mb-4">
                with {DEMO_CHARACTER.sidekick_name} the {DEMO_CHARACTER.sidekick_archetype}
              </p>
            )}

            {/* Traits */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {DEMO_CHARACTER.traits.map((trait) => (
                <span
                  key={trait}
                  className="text-xs px-3 py-1 rounded-full bg-muted/70 text-muted-foreground border border-border/60 shadow-sm"
                >
                  {trait}
                </span>
              ))}
            </div>

            {/* Age band indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
              <Heart className="w-3 h-3" />
              <span>Perfect for ages {DEMO_CHARACTER.age_band}</span>
            </div>

            {/* Start story button */}
            <Button
              onClick={() => navigate('/demo')}
              size="lg"
              className="w-full gap-2"
            >
              <Play className="w-5 h-5" />
              Start Demo Story
            </Button>
          </motion.div>

          {/* Info text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground mb-6"
          >
            This is a short, calming bedtime story designed for the littlest ones
          </motion.p>

          {/* Sign up CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="gap-2"
            >
              Create Your Own Hero
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
