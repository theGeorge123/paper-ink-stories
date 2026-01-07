import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  createThreeLevelQuestions,
  generateQuestionsContext,
  getNextQuestions,
  validateThreeLevelQuestions,
  type QuestionLevel,
  type ThreeLevelQuestions,
} from '@/lib/questions';
import { buildStoryBrief } from '@/lib/buildStoryBrief';
import {
  applyTags,
  createEpisodeId,
  getHero,
  getLastEpisode,
  getTopPreferenceTags,
  loadProfileId,
  saveEpisode,
  saveHero,
  type EpisodeChoices,
} from '@/lib/storyMemory';
import { getTotalPages } from '@/lib/storyEngine';

type SelectionState = {
  level1?: string;
  level2?: string;
  level3?: string;
};

const getSelectionTags = (level: QuestionLevel, optionLabel: string) => {
  return level.options.find((option) => option.label === optionLabel)?.tags ?? [];
};

const normalizeSummary = (summary: string, heroName: string) => {
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (sentences.length < 2) {
    sentences.push(`${heroName} drifts into safe, cozy sleep at the end.`);
  }

  return sentences.slice(0, 4).join(' ');
};

const estimateReadingTime = (text: string) => {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 150));
};

export default function CreateQuestions() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { language } = useLanguage();
  const profileId = useMemo(() => loadProfileId(), []);
  const hero = useMemo(() => getHero(profileId), [profileId]);
  const lastEpisode = useMemo(() => getLastEpisode(profileId), [profileId]);
  const topTags = useMemo(() => getTopPreferenceTags(profileId), [profileId]);
  const [questions, setQuestions] = useState<ThreeLevelQuestions | null>(null);
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [selections, setSelections] = useState<SelectionState>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!hero) {
      navigate('/create');
      return;
    }

    try {
      const nextQuestions = getNextQuestions(profileId, language);
      setQuestions(nextQuestions);
    } catch (error) {
      console.error('Question generation failed', error);
      const fallbackQuestions = createThreeLevelQuestions(
        generateQuestionsContext(hero, lastEpisode?.episodeSummary || 'None (first episode).', topTags, language),
      );
      if (validateThreeLevelQuestions(fallbackQuestions)) {
        setQuestions(fallbackQuestions);
        toast.message(
          language === 'nl'
            ? 'Er is een rustige set vragen geladen voor vanavond.'
            : language === 'sv'
            ? 'En lugn uppsättning frågor laddades för ikväll.'
            : 'Loaded a cozy fallback set of questions for tonight.',
        );
      } else {
        toast.error(
          language === 'nl'
            ? 'Vanavond kunnen we de vragen niet laden.'
            : language === 'sv'
            ? 'Vi kunde inte ladda kvällens frågor.'
            : 'Unable to load tonight’s questions.',
        );
        navigate('/create');
      }
    }
  }, [hero, language, lastEpisode, navigate, profileId, topTags]);

  if (!hero || !questions) {
    return null;
  }

  const questionForLevel: Record<1 | 2 | 3, QuestionLevel> = {
    1: questions.level1,
    2: questions.level2,
    3: questions.level3,
  };

  const handleSelect = (level: 1 | 2 | 3, optionLabel: string) => {
    setSelections((prev) => ({ ...prev, [`level${level}`]: optionLabel }));
    if (level < 3) {
      setCurrentLevel((level + 1) as 1 | 2 | 3);
    }
  };

  const hasAllSelections = selections.level1 && selections.level2 && selections.level3;

  const buildEpisodeChoices = (): EpisodeChoices => ({
    level1: selections.level1 || '',
    level2: selections.level2 || '',
    level3: selections.level3 || '',
  });

  const handleGenerate = async () => {
    if (!hasAllSelections) {
      toast.error(
        language === 'nl'
          ? 'Beantwoord alle drie vragen.'
          : language === 'sv'
          ? 'Välj ett svar för alla tre frågor.'
          : 'Please answer all three questions.',
      );
      return;
    }

    if (!session?.user?.id || !hero.supabaseCharacterId) {
      toast.error(
        language === 'nl'
          ? 'Log in om een nieuw verhaal te maken.'
          : language === 'sv'
          ? 'Logga in för att skapa en ny berättelse.'
          : 'Sign in to generate a new story.',
      );
      return;
    }

    setGenerating(true);

    try {
      const episodeNumber = lastEpisode ? lastEpisode.episodeNumber + 1 : 1;
      const lastSummary = lastEpisode?.episodeSummary || 'None (first episode).';
      const storyBrief = buildStoryBrief({
        hero,
        lastSummary,
        topTags,
        selections: buildEpisodeChoices(),
        language,
      });

      const storyTitle = `${hero.heroName}'s Bedtime Story`;
      const pendingChoice = selections.level1 || selections.level2 || selections.level3;

      await supabase
        .from('characters')
        .update({
          last_summary: lastEpisode?.episodeSummary ?? null,
          pending_choice: pendingChoice,
          preferred_themes: topTags,
          traits: [hero.heroTrait],
          archetype: hero.heroType.toLowerCase(),
        })
        .eq('id', hero.supabaseCharacterId);

      const { data: newStory, error: storyError } = await supabase
        .from('stories')
        .insert({
          character_id: hero.supabaseCharacterId,
          length_setting: 'SHORT',
          story_state: { location: 'Home', inventory: [], plot_outline: [storyBrief] },
          title: storyTitle,
        })
        .select()
        .single();

      if (storyError || !newStory) {
        throw storyError || new Error('Story creation failed');
      }

      const totalPages = getTotalPages('SHORT');
      const pageTexts: string[] = [];
      let episodeSummary = '';
      let storyThemes: string[] = [];

      for (let page = 1; page <= totalPages; page += 1) {
        const { data, error } = await supabase.functions.invoke('generate-page', {
          body: { storyId: newStory.id, targetPage: page },
        });

        if (error) {
          throw error;
        }

        if (data?.page_text) {
          pageTexts.push(data.page_text);
        }

        if (data?.adventure_summary) {
          episodeSummary = data.adventure_summary;
        }

        if (Array.isArray(data?.story_themes)) {
          storyThemes = data.story_themes;
        }
      }

      const storyText = pageTexts.join('\n\n');
      const summary = normalizeSummary(episodeSummary || lastSummary, hero.heroName);
      const optionTags = [
        ...getSelectionTags(questions.level1, selections.level1!),
        ...getSelectionTags(questions.level2, selections.level2!),
        ...getSelectionTags(questions.level3, selections.level3!),
      ];
      const tagsUsed = Array.from(new Set([...storyThemes, ...optionTags]));
      const readingTimeMinutes = estimateReadingTime(storyText);

      applyTags(profileId, tagsUsed);
      saveEpisode(profileId, {
        id: createEpisodeId(),
        episodeNumber,
        storyTitle,
        storyText,
        episodeSummary: summary,
        choices: buildEpisodeChoices(),
        tagsUsed,
        readingTimeMinutes,
        createdAt: new Date().toISOString(),
      });

      saveHero(profileId, hero);
      navigate('/read');
    } catch (error) {
      console.error('Failed to generate story', error);
      toast.error(
        language === 'nl'
          ? 'De verhaalmagie rust even. Probeer het straks opnieuw.'
          : language === 'sv'
          ? 'Sagomagin vilar en stund. Försök igen snart.'
          : 'Story magic is resting. Please try again soon.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const currentQuestion = questionForLevel[currentLevel];

  return (
    <div className="min-h-screen bg-background paper-texture">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {language === 'nl'
              ? `Niveau ${currentLevel} van 3`
              : language === 'sv'
              ? `Nivå ${currentLevel} av 3`
              : `Level ${currentLevel} of 3`}
          </p>
          <h1 className="text-3xl font-serif font-semibold text-foreground">{currentQuestion.question}</h1>
          <p className="text-muted-foreground">
            {language === 'nl'
              ? 'Kies de optie die vanavond het meest rustgevend voelt.'
              : language === 'sv'
              ? 'Välj det alternativ som känns mest rofyllt i kväll.'
              : 'Choose the option that feels most calming tonight.'}
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {currentQuestion.options.map((option) => (
            <Card
              key={option.id}
              className="p-4 border border-border/60 hover:border-primary/60 cursor-pointer transition"
              onClick={() => handleSelect(currentLevel, option.label)}
            >
              <div className="space-y-2">
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">
                  {language === 'nl'
                    ? 'Tik om te kiezen'
                    : language === 'sv'
                    ? 'Tryck för att välja'
                    : 'Tap to select'}
                </p>
              </div>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-2">
          <h2 className="font-medium text-foreground">
            {language === 'nl' ? 'Keuzes voor vanavond' : language === 'sv' ? 'Kvällens val' : 'Tonight’s picks'}
          </h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              {language === 'nl' ? 'Niveau 1' : language === 'sv' ? 'Nivå 1' : 'Level 1'}:{' '}
              {selections.level1 || '—'}
            </li>
            <li>
              {language === 'nl' ? 'Niveau 2' : language === 'sv' ? 'Nivå 2' : 'Level 2'}:{' '}
              {selections.level2 || '—'}
            </li>
            <li>
              {language === 'nl' ? 'Niveau 3' : language === 'sv' ? 'Nivå 3' : 'Level 3'}:{' '}
              {selections.level3 || '—'}
            </li>
          </ul>
        </section>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" onClick={() => navigate('/create')}>
            {language === 'nl' ? 'Held aanpassen' : language === 'sv' ? 'Redigera hjälten' : 'Edit hero'}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!hasAllSelections || generating}
            className="sm:ml-auto"
          >
            {generating
              ? language === 'nl'
                ? 'Verhaal maken...'
                : language === 'sv'
                ? 'Skapar berättelse...'
                : 'Creating story...'
              : language === 'nl'
              ? 'Maak het verhaal van vanavond'
              : language === 'sv'
              ? 'Skapa kvällens berättelse'
              : 'Create tonight’s story'}
          </Button>
        </div>
      </div>
    </div>
  );
}
