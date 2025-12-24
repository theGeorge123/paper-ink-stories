import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Map, Mountain, Castle, TreePine, Stars, Compass } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

interface Character {
  id: string;
  name: string;
  archetype: string;
  pending_choice?: string | null;
}

interface PathFinderModalProps {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_PATHS = [
  { icon: Castle, title: 'The Enchanted Castle', desc: 'Discover secrets in ancient halls', color: 'from-purple-400/20 to-indigo-400/20' },
  { icon: TreePine, title: 'The Whispering Forest', desc: 'Meet friendly woodland creatures', color: 'from-emerald-400/20 to-green-400/20' },
  { icon: Mountain, title: 'The Starlit Mountain', desc: 'Climb to touch the stars', color: 'from-amber-400/20 to-orange-400/20' },
];

export default function PathFinderModal({ character, open, onOpenChange }: PathFinderModalProps) {
  const [selectedPath, setSelectedPath] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLengthStep, setShowLengthStep] = useState(false);
  const [startingIntent, setStartingIntent] = useState<string>('');
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Use pending_choice if available, otherwise use default paths
  const paths = character.pending_choice 
    ? [{ icon: Sparkles, title: character.pending_choice, desc: 'Continue your adventure', color: 'from-primary/20 to-primary/30' }]
    : DEFAULT_PATHS;

  const handlePathSelect = (index: number, pathTitle: string) => {
    setSelectedPath(index);
    setStartingIntent(pathTitle);
    
    // Brief delay for animation, then show length selection
    setTimeout(() => {
      setShowLengthStep(true);
    }, 500);
  };

  const startNewStory = async (length: 'SHORT' | 'MEDIUM' | 'LONG') => {
    setLoading(true);

    // Deactivate old stories
    await supabase
      .from('stories')
      .update({ is_active: false })
      .eq('character_id', character.id);

    // Create new story with starting_intent in story_state
    const { data: newStory, error } = await supabase
      .from('stories')
      .insert({
        character_id: character.id,
        length_setting: length,
        is_active: true,
        story_state: {
          location: 'Home',
          inventory: [],
          plot_outline: [],
          starting_intent: startingIntent,
        },
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error('Failed to start adventure');
      return;
    }

    // Clear pending_choice since we're using it
    if (character.pending_choice) {
      await supabase
        .from('characters')
        .update({ pending_choice: null })
        .eq('id', character.id);
    }

    onOpenChange(false);
    navigate(`/read/${newStory.id}`);
  };

  const handleClose = () => {
    setSelectedPath(null);
    setShowLengthStep(false);
    setStartingIntent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass max-w-md p-0 overflow-hidden border-0">
        {/* Magic fog background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-primary/5 pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ 
                duration: 3 + Math.random() * 2, 
                repeat: Infinity, 
                delay: Math.random() * 2 
              }}
              className="absolute w-1 h-1 bg-primary rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 p-6">
          <AnimatePresence mode="wait">
            {!showLengthStep ? (
              <motion.div
                key="paths"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -50 }}
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Compass className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-1">
                    Choose Your Path
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Where will {character.name}'s adventure begin?
                  </p>
                </div>

                {/* Path Cards */}
                <div className="space-y-3">
                  {paths.map((path, index) => {
                    const Icon = path.icon;
                    const isSelected = selectedPath === index;
                    
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePathSelect(index, path.title)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 text-left ${
                          isSelected
                            ? 'border-primary bg-gradient-to-r ' + path.color + ' shadow-lg'
                            : 'border-border/50 bg-card/50 hover:border-primary/50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${path.color} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{path.title}</h3>
                          <p className="text-sm text-muted-foreground">{path.desc}</p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Sparkles className="w-3 h-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="length"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {/* Length Selection */}
                <div className="text-center mb-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Stars className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h2 className="font-serif text-2xl font-bold text-foreground mb-1">
                    How Long Tonight?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Choose the length of {character.name}'s adventure
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'SHORT', emoji: '🌙', label: 'Short', desc: '5 pages • ~5 min', color: 'from-indigo-400/20 to-purple-400/20' },
                    { key: 'MEDIUM', emoji: '🌟', label: 'Medium', desc: '8 pages • ~10 min', color: 'from-amber-400/20 to-orange-400/20' },
                    { key: 'LONG', emoji: '✨', label: 'Long', desc: '12 pages • ~15 min', color: 'from-rose-400/20 to-pink-400/20' },
                  ].map((option, index) => (
                    <motion.button
                      key={option.key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startNewStory(option.key as 'SHORT' | 'MEDIUM' | 'LONG')}
                      disabled={loading}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border/50 bg-gradient-to-r ${option.color} hover:border-primary/50 transition-all disabled:opacity-50`}
                    >
                      <span className="text-3xl">{option.emoji}</span>
                      <div className="text-left flex-1">
                        <div className="font-medium text-foreground">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.desc}</div>
                      </div>
                      {loading && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-5 h-5 text-primary" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setShowLengthStep(false)}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Choose different path
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}