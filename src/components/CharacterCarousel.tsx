import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Shield, Wand2, Cat, Bot, Crown, Flame, Settings, Trash2, Rocket, Anchor, Bird, Rabbit, Heart, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import EditCharacterModal from './EditCharacterModal';
import LengthSelectModal from './LengthSelectModal';
import useEmblaCarousel from 'embla-carousel-react';

const ARCHETYPE_ICONS: Record<string, React.ElementType> = {
  knight: Shield,
  wizard: Wand2,
  cat: Cat,
  robot: Bot,
  princess: Crown,
  dragon: Flame,
  astronaut: Rocket,
  pirate: Anchor,
  fairy: Sparkles,
  owl: Bird,
  bunny: Rabbit,
  bear: Heart,
};

const ARCHETYPE_COLORS: Record<string, { bg: string; accent: string; glow: string }> = {
  knight: { bg: 'from-blue-100 to-blue-200/50', accent: 'text-blue-600', glow: 'shadow-blue-400/40' },
  wizard: { bg: 'from-purple-100 to-purple-200/50', accent: 'text-purple-600', glow: 'shadow-purple-400/40' },
  cat: { bg: 'from-orange-100 to-orange-200/50', accent: 'text-orange-600', glow: 'shadow-orange-400/40' },
  robot: { bg: 'from-slate-100 to-slate-200/50', accent: 'text-slate-600', glow: 'shadow-slate-400/40' },
  princess: { bg: 'from-pink-100 to-pink-200/50', accent: 'text-pink-600', glow: 'shadow-pink-400/40' },
  dragon: { bg: 'from-red-100 to-red-200/50', accent: 'text-red-600', glow: 'shadow-red-400/40' },
  astronaut: { bg: 'from-cyan-100 to-cyan-200/50', accent: 'text-cyan-600', glow: 'shadow-cyan-400/40' },
  pirate: { bg: 'from-amber-100 to-amber-200/50', accent: 'text-amber-600', glow: 'shadow-amber-400/40' },
  fairy: { bg: 'from-fuchsia-100 to-fuchsia-200/50', accent: 'text-fuchsia-600', glow: 'shadow-fuchsia-400/40' },
  owl: { bg: 'from-emerald-100 to-emerald-200/50', accent: 'text-emerald-600', glow: 'shadow-emerald-400/40' },
  bunny: { bg: 'from-rose-100 to-rose-200/50', accent: 'text-rose-600', glow: 'shadow-rose-400/40' },
  bear: { bg: 'from-yellow-100 to-yellow-200/50', accent: 'text-yellow-600', glow: 'shadow-yellow-400/40' },
};

interface Character {
  id: string;
  name: string;
  archetype: string;
  age_band?: string;
  traits: string[];
  sidekick_name: string | null;
  sidekick_archetype: string | null;
  pending_choice?: string | null;
  hero_image_url?: string | null;
  stories?: { id: string; is_active: boolean; current_page?: number; last_summary?: string | null }[];
}

interface CharacterCarouselProps {
  characters: Character[];
  onCharacterUpdated?: () => void;
}

export default function CharacterCarousel({ characters, onCharacterUpdated }: CharacterCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: characters.length > 1,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startingAdventure, setStartingAdventure] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    onSelect();
    emblaApi.on('select', onSelect);

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const handleEditCharacter = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCharacter(character);
    setShowEditModal(true);
  };

  const handleDeleteClick = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCharacter(character);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCharacter) return;
    setDeleting(true);

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', selectedCharacter.id);

    setDeleting(false);
    setShowDeleteModal(false);

    if (error) {
      toast.error('Failed to delete character');
      console.error('Delete error:', error);
    } else {
      toast.success(t('characterDeleted'));
      onCharacterUpdated?.();
    }
  };

  // Show length selection modal first
  const handleNewAdventure = (character: Character) => {
    setSelectedCharacter(character);
    setShowLengthModal(true);
  };

  // Start adventure with selected length - pre-generate Page 1 before navigating
  const handleLengthSelect = async (length: 'SHORT' | 'MEDIUM' | 'LONG') => {
    if (!selectedCharacter) return;
    setStartingAdventure(true);
    
    try {
      // Step 1: Create the story
      const { data: newStory, error: storyError } = await supabase
        .from('stories')
        .insert({
          character_id: selectedCharacter.id,
          length_setting: length,
          story_state: { location: 'Home', inventory: [], plot_outline: [] },
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // Step 2: Pre-generate Page 1 before navigating
      const { data: pageData, error: pageError } = await supabase.functions.invoke('generate-page', {
        body: { storyId: newStory.id, targetPage: 1 },
      });

      if (pageError) {
        console.error('Page 1 generation failed:', pageError);
        // Still navigate - Reader will handle generation
      }

      setShowLengthModal(false);
      navigate(`/read/${newStory.id}`);
    } catch (error) {
      console.error('Failed to start adventure:', error);
      toast.error('Failed to start adventure');
      setStartingAdventure(false);
    }
  };

  // Get last adventure summary from inactive stories
  const getLastAdventure = (character: Character) => {
    const inactiveStory = character.stories?.find(s => !s.is_active && s.last_summary);
    return inactiveStory?.last_summary;
  };

  return (
    <>
      <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/40 p-4 sm:p-6 shadow-inner">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex items-stretch justify-center gap-4 sm:gap-6 pl-3 sm:pl-6 md:pl-10">
            {characters.map((character, index) => {
              const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
              const activeStory = character.stories?.find((s) => s.is_active);
              const colors = ARCHETYPE_COLORS[character.archetype] || { bg: 'from-primary/10 to-primary/20', accent: 'text-primary', glow: 'shadow-primary/30' };
              const lastAdventure = getLastAdventure(character);
              const isActive = index === selectedIndex;

                return (
                  <motion.div
                    key={character.id}
                    className="flex-shrink-0 basis-[88%] sm:basis-[60%] md:basis-[45%] lg:basis-[32%] xl:basis-[28%] max-w-[360px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                    animate={{
                      scale: isActive ? 1 : 0.85,
                      rotateY: isActive ? 0 : index < selectedIndex ? 5 : -5,
                      opacity: isActive ? 1 : 0.7,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ perspective: '1000px' }}
                    onClick={() => emblaApi?.scrollTo(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        emblaApi?.scrollTo(index);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                  <div className="book-cover group relative flex h-full flex-col p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">

                    {/* Settings & Delete buttons */}
                    <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleDeleteClick(character, e)}
                        className="w-7 h-7 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 45 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleEditCharacter(character, e)}
                        className="w-7 h-7 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>

                    {/* Decorative top border */}
                    <div className="absolute top-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                    {/* Character icon or portrait */}
                    <div className="flex-1 flex flex-col items-center justify-center pt-4 gap-1">
                      {character.hero_image_url ? (
                        <motion.div
                          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-background shadow-xl ${colors.glow} overflow-hidden mb-3 ring-2 ring-offset-2 ring-offset-background ring-white/50`}
                          whileHover={{ scale: 1.05 }}
                          animate={isActive ? { boxShadow: ['0 0 20px rgba(0,0,0,0.1)', '0 0 30px rgba(0,0,0,0.2)', '0 0 20px rgba(0,0,0,0.1)'] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <img
                            src={character.hero_image_url}
                            alt={character.name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br ${colors.bg} border-4 border-background shadow-xl ${colors.glow} flex items-center justify-center mb-3 ring-2 ring-offset-2 ring-offset-background ring-white/50`}
                          whileHover={{ scale: 1.05 }}
                          animate={isActive ? { boxShadow: ['0 0 20px rgba(0,0,0,0.1)', '0 0 30px rgba(0,0,0,0.2)', '0 0 20px rgba(0,0,0,0.1)'] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Icon className={`w-10 h-10 ${colors.accent}`} />
                        </motion.div>
                      )}

                      {/* Character info */}
                      <h3 className="font-serif text-xl sm:text-2xl text-foreground text-center mb-0.5 tracking-tight">
                        {character.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground capitalize font-medium mb-2">
                        The {character.archetype}
                      </p>

                      {character.sidekick_name && (
                        <p className="text-[11px] text-muted-foreground/80 mb-3">
                          with {character.sidekick_name}
                        </p>
                      )}

                      {/* Traits */}
                      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-4 px-2">
                        {character.traits.slice(0, 3).map((trait) => (
                          <span
                            key={trait}
                            className="text-[11px] sm:text-xs px-3 py-1 rounded-full bg-muted/70 text-muted-foreground border border-border/60 shadow-sm"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Last adventure memory */}
                    {lastAdventure && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50/70 border border-amber-200/70 shadow-sm">
                        <p className="text-[11px] sm:text-xs text-muted-foreground italic line-clamp-2 font-serif">
                          "{lastAdventure}"
                        </p>
                      </div>
                    )}

                    {/* Pending choice indicator */}
                    {character.pending_choice && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 shadow-sm">
                        <p className="text-[11px] sm:text-xs text-primary font-medium">
                          Tomorrow: {character.pending_choice}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 mt-auto">
                      {activeStory && (
                        <motion.div whileTap={{ scale: 0.98 }}>
                          <Button
                            onClick={() => navigate(`/read/${activeStory.id}`)}
                            className="w-full gap-2 shadow-sm"
                            size="sm"
                          >
                            <Play className="w-4 h-4" />
                            {t('continueStory')}
                          </Button>
                        </motion.div>
                      )}
                      <motion.div whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => handleNewAdventure(character)}
                          variant={activeStory ? 'outline' : 'default'}
                          className={`w-full gap-2 shadow-sm transition-all ${!activeStory ? 'animate-pulse-subtle' : 'hover:-translate-y-0.5'} ${activeStory ? 'hover:border-primary/50' : ''}`}
                          size="sm"
                          disabled={startingAdventure}
                        >
                          {startingAdventure ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <motion.div
                              animate={!activeStory ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Sparkles className="w-4 h-4" />
                            </motion.div>
                          )}
                          {startingAdventure ? 'Starting...' : t('newAdventure')}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      {characters.length > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          {characters.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`h-2.5 rounded-full transition-all duration-300 shadow-sm ${
                index === selectedIndex ? 'w-8 bg-primary' : 'w-2.5 bg-muted hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="glass max-w-sm">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="font-serif text-xl text-center">
              {t('deleteCharacter')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('deleteWarning').replace('{name}', selectedCharacter?.name || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="flex-1"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? 'Deleting...' : t('delete')}
            </Button>
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

      {/* Length Selection Modal */}
      {selectedCharacter && (
        <LengthSelectModal
          open={showLengthModal}
          onOpenChange={setShowLengthModal}
          onSelect={handleLengthSelect}
          characterName={selectedCharacter.name}
          loading={startingAdventure}
        />
      )}
    </>
  );
}
