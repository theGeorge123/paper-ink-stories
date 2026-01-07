import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import {
  getEpisodeById,
  getLastEpisode,
  getLastEpisodeId,
  getHero,
  loadProfileId,
} from '@/lib/storyMemory';

export default function ReadEpisode() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const profileId = useMemo(() => loadProfileId(), []);
  const episodeId = searchParams.get('episode') || getLastEpisodeId(profileId);
  const episode = episodeId
    ? getEpisodeById(profileId, episodeId)
    : getLastEpisode(profileId);
  const hero = getHero(profileId);

  if (!episode) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-background paper-texture flex items-center justify-center px-6"
      >
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            {language === 'nl' ? 'Nog geen verhaal' : language === 'sv' ? 'Ingen berättelse ännu' : 'No story yet'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'nl'
              ? 'Begin aan het eerste bedtijdavontuur om het hier te zien.'
              : language === 'sv'
              ? 'Starta det första godnattsäventyret för att se det här.'
              : 'Start your first bedtime adventure to see it here.'}
          </p>
          <Button onClick={() => navigate('/create/questions')}>
            {language === 'nl'
              ? 'Begin het verhaal van vanavond'
              : language === 'sv'
              ? 'Starta kvällens berättelse'
              : 'Start tonight’s story'}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <main id="main-content" className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {language === 'nl'
              ? `Aflevering ${episode.episodeNumber} • ${episode.readingTimeMinutes} min lezen`
              : language === 'sv'
              ? `Avsnitt ${episode.episodeNumber} • ${episode.readingTimeMinutes} min lästid`
              : `Episode ${episode.episodeNumber} • ${episode.readingTimeMinutes} min read`}
          </p>
          <h1 className="text-4xl font-serif font-semibold text-foreground">{episode.storyTitle}</h1>
          <p className="text-muted-foreground">
            {hero?.heroName
              ? language === 'nl'
                ? `${hero.heroName}’s knusse bedtijdavontuur.`
                : language === 'sv'
                ? `${hero.heroName}s mysiga godnattsäventyr.`
                : `${hero.heroName}'s cozy bedtime adventure.`
              : language === 'nl'
              ? 'Een knus bedtijdavontuur.'
              : language === 'sv'
              ? 'Ett mysigt godnattsäventyr.'
              : 'A cozy bedtime adventure.'}
          </p>
        </header>

        <article className="story-text text-lg leading-relaxed space-y-6 whitespace-pre-line">
          {episode.storyText}
        </article>

        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-2">
          <h2 className="font-medium text-foreground">
            {language === 'nl' ? 'Aflevering samenvatting' : language === 'sv' ? 'Sammanfattning' : 'Episode recap'}
          </h2>
          <p className="text-sm text-muted-foreground">{episode.episodeSummary}</p>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate('/create/questions')}>
            {language === 'nl'
              ? 'Volgende bedtijdverhaal'
              : language === 'sv'
              ? 'Nästa godnattsberättelse'
              : 'Next bedtime story'}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/create')}>
            {language === 'nl' ? 'Held aanpassen' : language === 'sv' ? 'Redigera hjälten' : 'Edit hero'}
          </Button>
        </div>
      </main>
    </div>
  );
}
