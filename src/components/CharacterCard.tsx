import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Shield, Wand2, Cat, Bot, Crown, Flame, BookOpen, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import LengthSelectModal from '@/components/LengthSelectModal';
import { normalizeHeroImageUrl } from '@/lib/heroImage';
import { useLanguage } from '@/hooks/useLanguage';
import { useLastStory } from '@/hooks/useLastStory';
import { formatReadingTime, estimateReadingTimeFromText } from '@/utils/readingTime';

const ARCHETYPE_ICONS: Record<string, React.ElementType> = {
  knight: Shield,
  wizard: Wand2,
  cat: Cat,
  robot: Bot,
  princess: Crown,
  dragon: Flame,
};

interface CharacterCardProps {
  character: {
    id: string;
    name: string;
    archetype: string;
    traits: string[];
    sidekick_name: string | null;
    age_band?: string;
    hero_image_url?: string | null;
    stories?: { id: string; is_active: boolean }[];
  };
}

export default function CharacterCard({ character }: CharacterCardProps) {
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();

  const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
  const activeStory = character.stories?.find((s) => s.is_active);
  const heroImageUrl = useMemo(
    () => normalizeHeroImageUrl(character.hero_image_url),
    [character.hero_image_url],
  );
  const { data: lastStory } = useLastStory(character.id);

  useEffect(() => {
    setImageError(false);
  }, [heroImageUrl]);

  const startNewStory = (length: 'SHORT' | 'MEDIUM' | 'LONG') => {
    setLoading(true);
    setShowLengthModal(false);
    navigate(`/questions/${character.id}?length=${length}`);
  };

  return (
    <>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="character-card p-6"
      >
        <div className="flex items-start gap-4">
          {heroImageUrl && !imageError ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
              <img
                src={heroImageUrl}
                alt={character.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-7 h-7 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-serif text-xl text-foreground">{character.name}</h3>
              {character.age_band && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Ages {character.age_band}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground capitalize mb-3">
              {character.archetype}
              {character.sidekick_name && ` & ${character.sidekick_name}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {character.traits.map((trait) => (
                <span key={trait} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          {activeStory && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  onClick={() => navigate(`/read/${activeStory.id}`)}
                  className="flex-1 gap-2"
                >
                  <Play className="w-4 h-4" />
                  Continue
                </Button>
              </HoverCardTrigger>
              {lastStory && (
                <HoverCardContent className="w-80">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-serif font-semibold text-sm text-foreground mb-1">
                        {lastStory.title || `${character.name}'s Adventure`}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {lastStory.hasBookmark && lastStory.currentPage > 0 && lastStory.totalPages > 0 ? (
                          <span className="text-primary font-medium">
                            {language === 'nl'
                              ? `Hervat vanaf pagina ${lastStory.currentPage} van ${lastStory.totalPages}`
                              : language === 'sv'
                              ? `Återuppta från sida ${lastStory.currentPage} av ${lastStory.totalPages}`
                              : `Resume from page ${lastStory.currentPage} of ${lastStory.totalPages}`}
                          </span>
                        ) : lastStory.totalPages > 0 ? (
                          <span>Page {lastStory.currentPage + 1} of {lastStory.totalPages}</span>
                        ) : null}
                        {lastStory.preview && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatReadingTime(estimateReadingTimeFromText(lastStory.preview))}
                          </span>
                        )}
                      </div>
                    </div>
                    {lastStory.preview && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {lastStory.preview}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {language === 'nl'
                        ? 'Klik om verder te lezen'
                        : language === 'sv'
                        ? 'Klicka för att fortsätta läsa'
                        : 'Click to continue reading'}
                    </p>
                  </div>
                </HoverCardContent>
              )}
            </HoverCard>
          )}
          <Button
            onClick={() => setShowLengthModal(true)}
            variant={activeStory ? 'outline' : 'default'}
            className="flex-1 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            New Adventure
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/stories/${character.id}`)}
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          {language === 'nl' ? 'Verhalenbibliotheek' : language === 'sv' ? 'Berättelsebibliotek' : 'Story Library'}
        </Button>
      </motion.div>

      <LengthSelectModal
        open={showLengthModal}
        onOpenChange={setShowLengthModal}
        onSelect={startNewStory}
        characterName={character.name}
        ageBand={character.age_band}
        loading={loading}
      />
    </>
  );
}
