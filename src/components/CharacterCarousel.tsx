import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, Shield, Wand2, Cat, Bot, Crown, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const ARCHETYPE_ICONS: Record<string, React.ElementType> = {
  knight: Shield,
  wizard: Wand2,
  cat: Cat,
  robot: Bot,
  princess: Crown,
  dragon: Flame,
};

const ARCHETYPE_COLORS: Record<string, string> = {
  knight: 'from-blue-500/20 to-blue-600/10',
  wizard: 'from-purple-500/20 to-purple-600/10',
  cat: 'from-orange-500/20 to-orange-600/10',
  robot: 'from-slate-500/20 to-slate-600/10',
  princess: 'from-pink-500/20 to-pink-600/10',
  dragon: 'from-red-500/20 to-red-600/10',
};

interface Character {
  id: string;
  name: string;
  archetype: string;
  traits: string[];
  sidekick_name: string | null;
  sidekick_archetype: string | null;
  stories?: { id: string; is_active: boolean }[];
}

interface CharacterCarouselProps {
  characters: Character[];
}

export default function CharacterCarousel({ characters }: CharacterCarouselProps) {
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const startNewStory = async (length: 'SHORT' | 'MEDIUM' | 'LONG') => {
    if (!selectedCharacter) return;
    setLoading(true);
    
    await supabase
      .from('stories')
      .update({ is_active: false })
      .eq('character_id', selectedCharacter.id);

    const { data: newStory, error } = await supabase
      .from('stories')
      .insert({
        character_id: selectedCharacter.id,
        length_setting: length,
        is_active: true,
      })
      .select()
      .single();

    setLoading(false);
    setShowLengthModal(false);

    if (!error && newStory) {
      navigate(`/read/${newStory.id}`);
    }
  };

  const handleNewAdventure = (character: Character) => {
    setSelectedCharacter(character);
    setShowLengthModal(true);
  };

  return (
    <>
      <Carousel
        opts={{
          align: 'center',
          loop: characters.length > 1,
        }}
        className="w-full max-w-md mx-auto"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {characters.map((character) => {
            const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
            const activeStory = character.stories?.find((s) => s.is_active);
            const gradientClass = ARCHETYPE_COLORS[character.archetype] || 'from-primary/20 to-primary/10';

            return (
              <CarouselItem key={character.id} className="pl-2 md:pl-4 basis-[85%]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`trading-card relative overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br ${gradientClass} backdrop-blur-sm p-6 shadow-xl`}
                >
                  {/* Decorative corner flourish */}
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M100 0 L100 100 L0 100 Q50 50 100 0" fill="currentColor" />
                    </svg>
                  </div>

                  {/* Character icon */}
                  <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 rounded-full bg-background/80 border-4 border-primary/30 flex items-center justify-center shadow-lg">
                      <Icon className="w-10 h-10 text-primary" />
                    </div>
                  </div>

                  {/* Character info */}
                  <div className="text-center mb-4">
                    <h3 className="font-serif text-2xl text-foreground mb-1">{character.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize font-medium">
                      The {character.archetype}
                    </p>
                    {character.sidekick_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        with {character.sidekick_name}
                      </p>
                    )}
                  </div>

                  {/* Traits */}
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {character.traits.slice(0, 3).map((trait) => (
                      <span 
                        key={trait} 
                        className="text-xs px-3 py-1 rounded-full bg-background/60 text-foreground/80 border border-border/30"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {activeStory && (
                      <Button
                        onClick={() => navigate(`/read/${activeStory.id}`)}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Play className="w-4 h-4" />
                        Continue Story
                      </Button>
                    )}
                    <Button
                      onClick={() => handleNewAdventure(character)}
                      variant={activeStory ? 'outline' : 'default'}
                      className="w-full gap-2"
                      size="lg"
                    >
                      <Sparkles className="w-4 h-4" />
                      New Adventure
                    </Button>
                  </div>
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {characters.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>

      <Dialog open={showLengthModal} onOpenChange={setShowLengthModal}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              How long is tonight's story?
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { key: 'SHORT', emoji: '🧸', label: 'Short', desc: '~5 pages', time: '5 min' },
              { key: 'MEDIUM', emoji: '📖', label: 'Medium', desc: '~8 pages', time: '10 min' },
              { key: 'LONG', emoji: '💤', label: 'Long', desc: '~12 pages', time: '15 min' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => startNewStory(option.key as 'SHORT' | 'MEDIUM' | 'LONG')}
                disabled={loading}
                className="length-pill hover:border-primary/50 flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/50 transition-all hover:bg-background/80"
              >
                <span className="text-3xl">{option.emoji}</span>
                <div className="text-left flex-1">
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc} • {option.time}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
