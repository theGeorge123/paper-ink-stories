import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { trackDemoEvent } from '@/lib/performance';
import {
  createThreeLevelQuestions,
  generateQuestionsContext,
  validateThreeLevelQuestions,
  type QuestionLevel,
  type ThreeLevelQuestions,
} from '@/lib/questions';
import { buildStoryBrief } from '@/lib/buildStoryBrief';
import {
  type DemoHeroInput,
  buildDemoRoute,
  getDemoHero,
  getDemoStoryContext,
  getOrCreateDemoId,
  saveDemoAnswers,
  saveDemoStory,
  saveDemoStoryMemory,
} from '@/lib/demoStorage';
import { supabase } from '@/integrations/supabase/client';

const DEMO_STORY_LIMIT = 3;

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

export default function DemoQuestions() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const demoId = useMemo(() => getOrCreateDemoId(), []);
  const [hero, setHero] = useState<DemoHeroInput | null>(null);
  const [questions, setQuestions] = useState<ThreeLevelQuestions | null>(null);
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [selections, setSelections] = useState<SelectionState>({});
  const [generating, setGenerating] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [storiesRemaining, setStoriesRemaining] = useState<number | null>(null);
  const [storyContext, setStoryContext] = useState(() => getDemoStoryContext());

  useEffect(() => {
    if (!demoId) return;

    const heroData = getDemoHero();
    if (!heroData) {
      navigate(buildDemoRoute('/demo-hero'));
      return;
    }

    setHero(heroData);

    const context = getDemoStoryContext();
    setStoryContext(context);
    const remaining = Math.max(0, DEMO_STORY_LIMIT - context.storiesUsed);
    setStoriesRemaining(remaining);
    setLimitReached(context.storiesUsed >= DEMO_STORY_LIMIT);

    try {
      const heroProfile = {
        heroName: heroData.heroName,
        heroType: heroData.heroType,
        heroTrait: heroData.heroTrait,
        comfortItem: heroData.comfortItem,
      };

      const questionContext = generateQuestionsContext(
        heroProfile,
        context.lastSummary,
        context.topTags,
        language,
      );
      const nextQuestions = createThreeLevelQuestions(questionContext);

      if (!validateThreeLevelQuestions(nextQuestions)) {
        throw new Error('Question generation failed: each level must have exactly 3 options.');
      }

      setQuestions(nextQuestions);
    } catch (error) {
      console.error('Question generation failed', error);
      if (heroData) {
        const fallbackContext = generateQuestionsContext(
          {
            heroName: heroData.heroName,
            heroType: heroData.heroType,
            heroTrait: heroData.heroTrait,
            comfortItem: heroData.comfortItem,
          },
          'None (first episode).',
          [],
          language,
        );
        const fallbackQuestions = createThreeLevelQuestions(fallbackContext);
        if (validateThreeLevelQuestions(fallbackQuestions)) {
          setQuestions(fallbackQuestions);
        }
      }
      toast.error(
        language === 'nl'
          ? 'Vanavond kunnen we de vragen niet laden.'
          : language === 'sv'
          ? 'Vi kunde inte ladda kvällens frågor.'
          : 'Unable to load tonight’s questions.',
      );
    }
  }, [demoId, language, navigate]);

  if (!hero) {
    return null;
  }

  if (limitReached) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-background paper-texture flex items-center justify-center px-6"
      >
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-serif font-semibold text-foreground">
            {language === 'nl'
              ? 'Demo limiet bereikt'
              : language === 'sv'
              ? 'Demogräns nådd'
              : 'Demo limit reached'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'nl'
              ? 'Je hebt alle drie demo-verhalen gebruikt. Maak een gratis account om door te gaan.'
              : language === 'sv'
              ? 'Du har använt alla tre demo-berättelser. Skapa ett gratis konto för att fortsätta.'
              : 'You have used all three demo stories. Create a free account to keep going.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/auth')}>
              {language === 'nl'
                ? 'Maak een account'
                : language === 'sv'
                ? 'Skapa konto'
                : 'Create account'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              {language === 'nl' ? 'Terug naar home' : language === 'sv' ? 'Tillbaka hem' : 'Back to home'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!questions) {
    return null;
  }

  const questionForLevel: Record<1 | 2 | 3, QuestionLevel> = {
    1: questions.level1,
    2: questions.level2,
    3: questions.level3,
  };

  const handleSelect = (level: 1 | 2 | 3, optionLabel: string) => {
    setSelections((prev) => ({ ...prev, [`level${level}`]: optionLabel }));
    trackDemoEvent('demo_question_selected', { demoId, level, option: optionLabel });
    if (level < 3) {
      setCurrentLevel((level + 1) as 1 | 2 | 3);
    }
  };

  const hasAllSelections = selections.level1 && selections.level2 && selections.level3;

  const buildEpisodeChoices = () => ({
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

    if (limitReached || !demoId) {
      toast.error(
        language === 'nl'
          ? 'Demo limiet bereikt. Maak een account om door te gaan.'
          : language === 'sv'
          ? 'Demogräns nådd. Skapa ett konto för att fortsätta.'
          : 'Demo limit reached. Create an account to continue.',
      );
      return;
    }

    setGenerating(true);

    try {
      const selectionsPayload = buildEpisodeChoices();
      const selectionTags = [
        ...getSelectionTags(questions.level1, selections.level1!),
        ...getSelectionTags(questions.level2, selections.level2!),
        ...getSelectionTags(questions.level3, selections.level3!),
      ];

      saveDemoAnswers(selectionsPayload);

      const storyBrief = buildStoryBrief({
        hero: {
          heroName: hero.heroName,
          heroType: hero.heroType,
          heroTrait: hero.heroTrait,
          comfortItem: hero.comfortItem,
        },
        lastSummary: storyContext.lastSummary,
        topTags: storyContext.topTags,
        selections: selectionsPayload,
        language,
      });

      const sidekickDetails = hero.sidekickName
        ? `\nSIDEKICK\n- Name: ${hero.sidekickName}\n- Type: ${hero.sidekickArchetype || 'friend'}\n- Include the sidekick as a supportive companion.`
        : '';

      const { data, error } = await supabase.functions.invoke('generate-demo-story', {
        body: {
          storyBrief: `${storyBrief}${sidekickDetails}`,
          heroName: hero.heroName,
          language,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.story) {
        throw new Error('Story generation failed');
      }

      const summary = normalizeSummary(data.summary || storyContext.lastSummary, hero.heroName);
      const tagsFromStory = Array.isArray(data.tags_used) ? data.tags_used : [];
      const tagsUsed = Array.from(new Set([...selectionTags, ...tagsFromStory]));
      const readingTimeMinutes =
        typeof data.reading_time_minutes === 'number'
          ? data.reading_time_minutes
          : estimateReadingTime(data.story);
      const storyTitle = data.title || `${hero.heroName}'s Bedtime Story`;

      saveDemoStory({
        storyTitle,
        storyText: data.story,
        episodeSummary: summary,
        choices: selectionsPayload,
        tagsUsed,
        readingTimeMinutes,
        createdAt: new Date().toISOString(),
      });

      saveDemoStoryMemory(summary, tagsUsed);

      const newStoriesUsed = storyContext.storiesUsed + 1;
      const remaining = Math.max(0, DEMO_STORY_LIMIT - newStoriesUsed);
      setStoriesRemaining(remaining);
      setLimitReached(newStoriesUsed >= DEMO_STORY_LIMIT);
      setStoryContext((prev) => ({
        ...prev,
        lastSummary: summary,
        storiesUsed: newStoriesUsed,
        topTags: tagsUsed,
      }));

      trackDemoEvent('demo_story_generated', { demoId });
      navigate(buildDemoRoute('/demo-reader'));
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
      <main id="main-content" className="max-w-3xl mx-auto px-6 py-10 space-y-8">
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
          {storiesRemaining !== null && (
            <p className="text-sm text-muted-foreground">
              {language === 'nl'
                ? `Je hebt nog ${storiesRemaining} demo${storiesRemaining === 1 ? '' : '-'}verhaal${storiesRemaining === 1 ? '' : 'en'} over.`
                : language === 'sv'
                ? `Du har ${storiesRemaining} demo${storiesRemaining === 1 ? 'berättelse' : 'berättelser'} kvar.`
                : `You have ${storiesRemaining} demo stor${storiesRemaining === 1 ? 'y' : 'ies'} left.`}
            </p>
          )}
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 border-border/60 hover:border-primary/60 cursor-pointer transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => handleSelect(currentLevel, option.label)}
              aria-label={option.label}
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
            </button>
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
          <Button variant="ghost" onClick={() => navigate(buildDemoRoute('/demo-hero'))}>
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
      </main>
    </div>
  );
}
