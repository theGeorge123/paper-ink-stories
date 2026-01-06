import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Home, Cat, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEMO_CHARACTER } from '@/data/demoStory';

export default function DemoHero() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <Home className="w-5 h-5" />
        </Button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center"
        >
          {/* Hero portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-amber-100 to-amber-200/50 border-4 border-background shadow-lg flex items-center justify-center mb-6"
          >
            <Cat className="w-16 h-16 text-amber-600" />
          </motion.div>

          {/* Character name */}
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            {DEMO_CHARACTER.name}
          </h1>
          <p className="text-lg text-muted-foreground capitalize mb-4">
            The {DEMO_CHARACTER.archetype}
          </p>

          {/* Sidekick */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm">
              with {DEMO_CHARACTER.sidekick_name} the {DEMO_CHARACTER.sidekick_archetype}
            </span>
          </div>

          {/* Traits */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {DEMO_CHARACTER.traits.map((trait) => (
              <span
                key={trait}
                className="text-sm px-4 py-1.5 rounded-full bg-muted text-muted-foreground"
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Start story button */}
          <Button
            onClick={() => navigate('/demo')}
            size="lg"
            className="w-full gap-2 text-lg py-6"
          >
            <Play className="w-5 h-5" />
            Start Story
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
