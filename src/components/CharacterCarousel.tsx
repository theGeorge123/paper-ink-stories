import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Shield, Wand2, Cat, Bot, Crown, Flame, Settings, Trash2, Rocket, Anchor, Bird, Rabbit, Heart, AlertTriangle, Loader2, MoonStar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import EditCharacterModal from './EditCharacterModal';
import LengthSelectModal from './LengthSelectModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBatchSignedUrls } from '@/hooks/useBatchSignedUrls';
import { TranslationKey } from '@/lib/i18n';

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

const ROUTE_OPTIONS: { value: 'A' | 'B' | 'C'; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { value: 'A', titleKey: 'routeAName', descKey: 'routeADesc' },
  { value: 'B', titleKey: 'routeBName', descKey: 'routeBDesc' },
  { value: 'C', titleKey: 'routeCName', descKey: 'routeCDesc' },
];

function HeroPortrait({
  character,
  imageUrl,
  size = 'w-14 h-14',
  rounded = 'rounded-full',
  className = '',
  onRetry,
}: {
  character: Character;
  imageUrl?: string | null;
  size?: string;
  rounded?: string;
  className?: string;
  onRetry?: () => void;
}) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
  const colors = ARCHETYPE_COLORS[character.archetype] || { bg: 'from-primary/10 to-primary/20', accent: 'text-primary', glow: 'shadow-primary/30' };

  if (!imageUrl || error) {
    return (
      <div className={`${size} ${rounded} bg-gradient-to-br ${colors.bg} border-2 border-background shadow-md flex items-center justify-center flex-shrink-0 ${className}`}>
        <div className="flex flex-col items-center gap-1">
          <Icon className={`w-7 h-7 ${colors.accent}`} />
          {onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setError(false);
                onRetry();
              }}
              className="text-[10px] text-muted-foreground underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${size} ${rounded} border-2 border-background shadow-md ${colors.glow} overflow-hidden flex-shrink-0 ${className} relative`}>
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 animate-pulse" />
      )}
      <img
        src={imageUrl}
        alt={character.name}
        className="w-full h-full object-cover"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />
    </div>
  );
}

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'A' | 'B' | 'C' | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [startingAdventure, setStartingAdventure] = useState(false);
  const [loadingCharacterId, setLoadingCharacterId] = useState<string | null>(null);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Batch fetch all hero portrait URLs - pass character objects to use existing signed URLs
  const charactersForUrls = useMemo(() => 
    characters.map(c => ({ id: c.id, hero_image_url: c.hero_image_url })), 
    [characters]
  );
  const { urls: batchUrls, refresh: refreshUrls } = useBatchSignedUrls(charactersForUrls);

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

  const startAdventure = async (
    character: Character,
    length: 'SHORT' | 'MEDIUM' | 'LONG',
    route: 'A' | 'B' | 'C'
  ) => {
    setStartingAdventure(true);
    setLoadingCharacterId(character.id);

    try {
      const { data, error } = await supabase.functions.invoke('start-story-generation', {
        body: { characterId: character.id, length, storyRoute: route },
      });

      if (error || !data?.storyId) {
        throw error || new Error('Could not start story');
      }

      setShowLengthModal(false);
      setShowRouteModal(false);
      navigate(`/read/${data.storyId}`);
    } catch (error) {
      console.error('Failed to start adventure:', error);
      toast.error('Failed to start adventure');
    } finally {
      setStartingAdventure(false);
      setLoadingCharacterId(null);
    }
  };

  const handleNewAdventure = (character: Character) => {
    setSelectedCharacter(character);
    setSelectedRoute(null);
    setShowRouteModal(true);
  };

  const handleLengthSelect = async (length: 'SHORT' | 'MEDIUM' | 'LONG') => {
    if (!selectedCharacter || !selectedRoute) {
      setShowRouteModal(true);
      return;
    }
    await startAdventure(selectedCharacter, length, selectedRoute);
  };

  const handleRouteSelect = async (route: 'A' | 'B' | 'C') => {
    setSelectedRoute(route);
    if (!selectedCharacter) return;

    if (selectedCharacter.age_band === '1-2') {
      await startAdventure(selectedCharacter, 'SHORT', route);
      return;
    }

    setShowRouteModal(false);
    setShowLengthModal(true);
  };

  const handleContinueStory = (storyId: string) => {
    navigate(`/read/${storyId}`);
  };

  // Mobile compact card component
  const MobileCharacterCard = ({ character }: { character: Character }) => {
    const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
    const activeStory = character.stories?.find((s) => s.is_active);
    const colors = ARCHETYPE_COLORS[character.archetype] || { bg: 'from-primary/10 to-primary/20', accent: 'text-primary', glow: 'shadow-primary/30' };
    const isLoading = loadingCharacterId === character.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
      >
        <div className="p-4">
          {/* Header row: avatar + name + action buttons */}
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <HeroPortrait character={character} imageUrl={batchUrls[character.id]} onRetry={refreshUrls} />

            {/* Name and archetype */}
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-lg font-medium text-foreground truncate">
                {character.name}
              </h3>
              <p className="text-xs text-muted-foreground capitalize">
                The {character.archetype}
                {character.sidekick_name && ` • ${character.sidekick_name}`}
              </p>
              <div className="mt-1 inline-flex items-center gap-2 text-[11px] text-primary font-medium">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {t('ageBadge').replace('{range}', character.age_band || '1-2')}
                </span>
                {character.age_band === '1-2' && (
                  <span className="text-muted-foreground">{t('ageShortSublabel')}</span>
                )}
              </div>
            </div>

          {/* Edit/Delete buttons */}
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={(e) => handleDeleteClick(character, e)}
                aria-label={`Delete ${character.name}`}
                className="w-9 h-9 rounded-full bg-destructive/10 flex items-center justify-center text-destructive active:bg-destructive/20"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleEditCharacter(character, e)}
                aria-label={`Edit ${character.name}`}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground active:bg-muted/80"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pending choice / Next adventure direction */}
          {character.pending_choice && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary font-medium line-clamp-2">
                ✨ Next: {character.pending_choice}
              </p>
            </div>
          )}

          {/* Action buttons - full width, stacked */}
          <div className="flex flex-col gap-2">
            {activeStory && (
              <Button
                onClick={() => handleContinueStory(activeStory.id)}
                className="w-full h-12 text-base gap-2"
                size="lg"
              >
                <Play className="w-5 h-5" />
                {t('continueStory')}
              </Button>
            )}
            <Button
              onClick={() => handleNewAdventure(character)}
              variant={activeStory ? 'outline' : 'default'}
              className={`w-full h-12 text-base gap-2 ${!activeStory ? 'animate-pulse-subtle' : ''}`}
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              {isLoading ? 'Starting...' : t('newAdventure')}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Desktop book-style card
  const DesktopCharacterCard = ({ character, index }: { character: Character; index: number }) => {
    const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
    const activeStory = character.stories?.find((s) => s.is_active);
    const colors = ARCHETYPE_COLORS[character.archetype] || { bg: 'from-primary/10 to-primary/20', accent: 'text-primary', glow: 'shadow-primary/30' };
    const isLoading = loadingCharacterId === character.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="book-cover group relative flex flex-col p-6 min-w-[280px] max-w-[300px] h-auto min-h-[420px]"
      >
        {/* Settings & Delete buttons */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => handleDeleteClick(character, e)}
            aria-label={`Delete ${character.name}`}
            className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 45 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => handleEditCharacter(character, e)}
            aria-label={`Edit ${character.name}`}
            className="w-10 h-10 rounded-full bg-background/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Decorative top border */}
        <div className="absolute top-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Character icon or portrait */}
        <div className="flex-1 flex flex-col items-center justify-center pt-4 gap-1">
          <motion.div
            className="mb-3"
            whileHover={{ scale: 1.05 }}
          >
            <HeroPortrait
              character={character}
              imageUrl={batchUrls[character.id]}
              size="w-24 h-24"
              className={`ring-2 ring-offset-2 ring-offset-background ring-white/50 ${colors.glow}`}
              onRetry={refreshUrls}
            />
          </motion.div>

          {/* Character info */}
          <h3 className="font-serif text-xl text-foreground text-center mb-0.5 tracking-tight">
            {character.name}
          </h3>
          <p className="text-sm text-muted-foreground capitalize font-medium mb-2">
            The {character.archetype}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs mb-3">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
              {t('ageBadge').replace('{range}', character.age_band || '1-2')}
            </span>
            {character.age_band === '1-2' && (
              <span className="text-muted-foreground">{t('ageShortSublabel')}</span>
            )}
          </div>

          {character.sidekick_name && (
            <p className="text-xs text-muted-foreground/80 mb-3">
              with {character.sidekick_name}
            </p>
          )}

          {/* Traits */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-4 px-2">
            {character.traits.slice(0, 3).map((trait) => (
              <span
                key={trait}
                className="text-xs px-3 py-1 rounded-full bg-muted/70 text-muted-foreground border border-border/60 shadow-sm"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* Pending choice indicator */}
        {character.pending_choice && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 shadow-sm">
            <p className="text-xs text-primary font-medium">
              Tomorrow: {character.pending_choice}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto">
          {activeStory && (
            <Button
              onClick={() => handleContinueStory(activeStory.id)}
              className="w-full gap-2 shadow-sm"
              size="default"
            >
              <Play className="w-4 h-4" />
              {t('continueStory')}
            </Button>
          )}
          <Button
            onClick={() => handleNewAdventure(character)}
            variant={activeStory ? 'outline' : 'default'}
            className={`w-full gap-2 shadow-sm ${!activeStory ? 'animate-pulse-subtle' : ''}`}
            size="default"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isLoading ? 'Starting...' : t('newAdventure')}
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Mobile: Stacked list layout */}
      {isMobile ? (
        <div className="flex flex-col gap-4 px-1">
          {characters.map((character) => (
            <MobileCharacterCard key={character.id} character={character} />
          ))}
        </div>
      ) : (
        /* Desktop: Horizontal scroll with book cards */
        <div className="rounded-3xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/40 p-6 shadow-inner">
          <div className="flex gap-6 overflow-x-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {characters.map((character, index) => (
              <DesktopCharacterCard key={character.id} character={character} index={index} />
            ))}
          </div>
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

      {/* Route Selection Modal */}
      {selectedCharacter && (
        <Dialog open={showRouteModal} onOpenChange={setShowRouteModal}>
          <DialogContent className="glass max-w-md">
            <DialogHeader>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MoonStar className="w-7 h-7 text-primary" />
              </div>
              <DialogTitle className="font-serif text-xl text-center">
                {t('routeChoiceTitle')}
              </DialogTitle>
              <DialogDescription className="text-center text-base text-muted-foreground">
                {t('routeChoiceDescription').replace('{name}', selectedCharacter.name)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {ROUTE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleRouteSelect(option.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedRoute === option.value
                      ? 'border-primary/60 bg-primary/10 shadow-[0_10px_40px_-30px_rgba(59,130,246,0.8)]'
                      : 'border-border bg-muted/40 hover:border-primary/40 hover:bg-muted'
                  }`}
                  disabled={startingAdventure}
                  aria-pressed={selectedRoute === option.value}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-serif font-semibold text-foreground">{t(option.titleKey)}</p>
                      <p className="text-sm text-muted-foreground">{t(option.descKey)}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                      {option.value}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center text-sm text-muted-foreground">
              {selectedCharacter.age_band === '1-2'
                ? t('shortAutomatic')
                : selectedRoute
                  ? t('routeContinue')
                  : t('routeGentlePrompt')}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Length Selection Modal */}
      {selectedCharacter && (
        <LengthSelectModal
          open={showLengthModal}
          onOpenChange={setShowLengthModal}
          onSelect={handleLengthSelect}
          characterName={selectedCharacter.name}
          ageBand={selectedCharacter.age_band}
          loading={startingAdventure}
        />
      )}
    </>
  );
}
