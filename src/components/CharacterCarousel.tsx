import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Shield, Wand2, Cat, Bot, Crown, Flame, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import EditCharacterModal from './EditCharacterModal';

const ARCHETYPE_ICONS: Record<string, React.ElementType> = {
  knight: Shield,
  wizard: Wand2,
  cat: Cat,
  robot: Bot,
  princess: Crown,
  dragon: Flame,
};

const ARCHETYPE_COLORS: Record<string, { bg: string; accent: string }> = {
  knight: { bg: 'from-blue-50 to-blue-100/50', accent: 'text-blue-600' },
  wizard: { bg: 'from-purple-50 to-purple-100/50', accent: 'text-purple-600' },
  cat: { bg: 'from-orange-50 to-orange-100/50', accent: 'text-orange-600' },
  robot: { bg: 'from-slate-50 to-slate-100/50', accent: 'text-slate-600' },
  princess: { bg: 'from-pink-50 to-pink-100/50', accent: 'text-pink-600' },
  dragon: { bg: 'from-red-50 to-red-100/50', accent: 'text-red-600' },
};

interface Character {
  id: string;
  name: string;
  archetype: string;
  traits: string[];
  sidekick_name: string | null;
  sidekick_archetype: string | null;
  stories?: { id: string; is_active: boolean; last_summary?: string | null }[];
}

interface CharacterCarouselProps {
  characters: Character[];
  onCharacterUpdated?: () => void;
}

export default function CharacterCarousel({ characters, onCharacterUpdated }: CharacterCarouselProps) {
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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

  const handleEditCharacter = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCharacter(character);
    setShowEditModal(true);
  };

  // Get last adventure summary from inactive stories
  const getLastAdventure = (character: Character) => {
    const inactiveStory = character.stories?.find(s => !s.is_active && s.last_summary);
    return inactiveStory?.last_summary;
  };

  return (
    <>
      <Carousel
        opts={{
          align: 'center',
          loop: characters.length > 1,
        }}
        className="w-full max-w-sm mx-auto"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {characters.map((character, index) => {
            const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
            const activeStory = character.stories?.find((s) => s.is_active);
            const colors = ARCHETYPE_COLORS[character.archetype] || { bg: 'from-primary/5 to-primary/10', accent: 'text-primary' };
            const lastAdventure = getLastAdventure(character);

            return (
              <CarouselItem key={character.id} className="pl-2 md:pl-4 basis-[85%]">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="book-cover p-6 flex flex-col"
                >
                  {/* Settings gear */}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 45 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleEditCharacter(character, e)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
                  >
                    <Settings className="w-4 h-4" />
                  </motion.button>

                  {/* Decorative top border */}
                  <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                  {/* Character icon */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.div 
                      className={`w-24 h-24 rounded-full bg-gradient-to-br ${colors.bg} border-4 border-background shadow-lg flex items-center justify-center mb-4`}
                      whileHover={{ scale: 1.05 }}
                    >
                      <Icon className={`w-12 h-12 ${colors.accent}`} />
                    </motion.div>

                    {/* Character info */}
                    <h3 className="font-serif text-2xl text-foreground text-center mb-1">{character.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize font-medium mb-3">
                      The {character.archetype}
                    </p>
                    
                    {character.sidekick_name && (
                      <p className="text-xs text-muted-foreground/80 mb-3">
                        with {character.sidekick_name}
                      </p>
                    )}

                    {/* Traits */}
                    <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                      {character.traits.slice(0, 3).map((trait) => (
                        <span 
                          key={trait} 
                          className="text-xs px-2.5 py-1 rounded-full bg-muted/80 text-muted-foreground"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Last adventure memory */}
                  {lastAdventure && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-secondary/20 border border-secondary/30">
                      <p className="text-xs text-muted-foreground italic line-clamp-2">
                        <span className="text-secondary font-medium">Last Adventure:</span> {lastAdventure}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 mt-auto">
                    {activeStory && (
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => navigate(`/read/${activeStory.id}`)}
                          className="w-full gap-2"
                          size="lg"
                        >
                          <Play className="w-4 h-4" />
                          Continue Story
                        </Button>
                      </motion.div>
                    )}
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => handleNewAdventure(character)}
                        variant={activeStory ? 'outline' : 'default'}
                        className="w-full gap-2"
                        size="lg"
                      >
                        <Sparkles className="w-4 h-4" />
                        New Adventure
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {characters.length > 1 && (
          <>
            <CarouselPrevious className="left-0 -translate-x-1/2" />
            <CarouselNext className="right-0 translate-x-1/2" />
          </>
        )}
      </Carousel>

      {/* Story Length Modal */}
      <Dialog open={showLengthModal} onOpenChange={setShowLengthModal}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              How long is tonight's story?
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { key: 'SHORT', emoji: '🧸', label: 'Short', desc: '5 pages', time: '~5 min' },
              { key: 'MEDIUM', emoji: '📖', label: 'Medium', desc: '8 pages', time: '~10 min' },
              { key: 'LONG', emoji: '💤', label: 'Long', desc: '12 pages', time: '~15 min' },
            ].map((option) => (
              <motion.button
                key={option.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startNewStory(option.key as 'SHORT' | 'MEDIUM' | 'LONG')}
                disabled={loading}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/80 transition-all hover:border-primary/50 hover:bg-background"
              >
                <span className="text-3xl">{option.emoji}</span>
                <div className="text-left flex-1">
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc} • {option.time}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Character Modal */}
      {selectedCharacter && (
        <EditCharacterModal
          character={selectedCharacter}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSaved={onCharacterUpdated}
        />
      )}
    </>
  );
}
