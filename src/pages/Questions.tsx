import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Home, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';
import {
  createThreeLevelQuestions,
  generateQuestionsContext,
  validateThreeLevelQuestions,
  type QuestionLevel,
  type ThreeLevelQuestions,
} from '@/lib/questions';
import { getTotalPages } from '@/lib/storyEngine';

const levelLabels = {
  en: 'Level',
  nl: 'Niveau',
  sv: 'Nivå',
} as const;

type SelectionState = {
  level1?: string;
  level2?: string;
  level3?: string;
};

type QuestionHistoryEntry = {
  page: number;
  choices: SelectionState;
  tags: string[];
  created_at: string;
};

type StoryState = {
  location?: string | null;
  inventory?: string[];
  plot_outline?: string[];
  question_history?: QuestionHistoryEntry[];
};

const getSelectionTags = (level: QuestionLevel, optionLabel: string) => {
  return level.options.find((option) => option.label === optionLabel)?.tags ?? [];
};

const normalizeStoryState = (storyState: StoryState | null | undefined): StoryState => {
  if (!storyState) {
    return {
      location: null,
      inventory: [],
      plot_outline: [],
      question_history: [],
    };
  }

  return {
    location: storyState.location ?? null,
    inventory: Array.isArray(storyState.inventory) ? storyState.inventory : [],
    plot_outline: Array.isArray(storyState.plot_outline) ? storyState.plot_outline : [],
    question_history: Array.isArray(storyState.question_history) ? storyState.question_history : [],
  };
};

export default function Questions() {
  const { storyId } = useParams<{ storyId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [questions, setQuestions] = useState<ThreeLevelQuestions | null>(null);
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [selections, setSelections] = useState<SelectionState>({});
  const [saving, setSaving] = useState(false);

  const questionPage = Number(searchParams.get('page')) || 1;

  const { data: story } = useQuery({
    queryKey: ['story', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stories')
        .select('*, characters(*)')
        .eq('id', storyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!storyId,
  });

  const heroProfile = useMemo(() => {
    if (!story?.characters) return null;
    const character = story.characters as {
      id: string;
      name: string;
      archetype: string;
      traits?: string[] | null;
      preferred_themes?: string[] | null;
      last_summary?: string | null;
      hero_image_url?: string | null;
    };

    return {
      heroName: character.name,
      heroType: character.archetype || 'friend',
      heroTrait: character.traits?.[0] || 'Kind',
      comfortItem: 'blanket',
      supabaseCharacterId: character.id,
    };
  }, [story?.characters]);

  const heroPortrait = useSignedImageUrl({
    initialUrl: story?.characters?.hero_image_url,
    heroId: story?.characters?.id,
  });

  useEffect(() => {
    if (!heroProfile) return;

    try {
      const lastSummary = story?.characters?.last_summary || 'None (first episode).';
      const topTags = (story?.characters?.preferred_themes as string[]) || [];
      const questionContext = generateQuestionsContext(heroProfile, lastSummary, topTags, language);
      const nextQuestions = createThreeLevelQuestions(questionContext);

      if (!validateThreeLevelQuestions(nextQuestions)) {
        throw new Error('Question generation failed: each level must have exactly 3 options.');
      }

      setQuestions(nextQuestions);
    } catch (error) {
      console.error('Question generation failed', error);
      const fallbackContext = generateQuestionsContext(
        heroProfile,
        story?.characters?.last_summary || 'None (first episode).',
        (story?.characters?.preferred_themes as string[]) || [],
        language,
      );
      const fallbackQuestions = createThreeLevelQuestions(fallbackContext);
      if (validateThreeLevelQuestions(fallbackQuestions)) {
        setQuestions(fallbackQuestions);
      }
      toast.error(
        language === 'nl'
          ? 'Vanavond kunnen we de vragen niet laden.'
          : language === 'sv'
          ? 'Vi kunde inte ladda kvällens frågor.'
          : 'Unable to load tonight’s questions.',
      );
    }
  }, [heroProfile, language, story?.characters?.last_summary, story?.characters?.preferred_themes]);

  if (!story || !heroProfile || !questions) {
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

  const handleContinue = async () => {
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

    setSaving(true);

    try {
      const selectionTags = [
        ...getSelectionTags(questions.level1, selections.level1!),
        ...getSelectionTags(questions.level2, selections.level2!),
        ...getSelectionTags(questions.level3, selections.level3!),
      ];

      const storyState = normalizeStoryState(story.story_state as StoryState);
      const selectionSummary = `Question choices after page ${questionPage}: ${
        selections.level1
      } / ${selections.level2} / ${selections.level3}`;
      const updatedStoryState: StoryState = {
        ...storyState,
        plot_outline: storyState.plot_outline?.includes(selectionSummary)
          ? storyState.plot_outline
          : [...(storyState.plot_outline || []), selectionSummary],
        question_history: [
          ...(storyState.question_history || []),
          {
            page: questionPage,
            choices: selections,
            tags: selectionTags,
            created_at: new Date().toISOString(),
          },
        ],
      };

      const character = story.characters as { id: string; preferred_themes?: string[] | null };
      const currentPreferred = (character.preferred_themes as string[]) || [];
      const updatedPreferred = Array.from(new Set([...currentPreferred, ...selectionTags])).slice(-10);

      await Promise.all([
        supabase.from('stories').update({ story_state: updatedStoryState }).eq('id', story.id),
        supabase.from('characters').update({ preferred_themes: updatedPreferred }).eq('id', character.id),
      ]);

      const totalPages = getTotalPages(story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG');
      const nextPage = Math.min(questionPage + 1, totalPages);
      navigate(`/read/${story.id}?page=${nextPage}`);
    } catch (error) {
      console.error('Failed to save question answers', error);
      toast.error(
        language === 'nl'
          ? 'De verhaalmagie rust even. Probeer het straks opnieuw.'
          : language === 'sv'
          ? 'Sagomagin vilar en stund. Försök igen snart.'
          : 'Story magic is resting. Please try again soon.',
      );
    } finally {
      setSaving(false);
    }
  };

  const currentQuestion = questionForLevel[currentLevel];
  const heroAvatarUrl = heroPortrait.url || story.characters?.hero_image_url;

  return (
    <div className="min-h-screen bg-background paper-texture">
      <main id="main-content" className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/30 shadow-sm">
              <AvatarImage src={heroAvatarUrl || undefined} alt={`${heroProfile.heroName} portrait`} />
              <AvatarFallback className="text-primary">
                <UserCircle className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'nl'
                  ? `${levelLabels.nl} ${currentLevel} van 3`
                  : language === 'sv'
                  ? `${levelLabels.sv} ${currentLevel} av 3`
                  : `${levelLabels.en} ${currentLevel} of 3`}
              </p>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                {currentQuestion.question}
              </h1>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/read/${story.id}`)}>
            <Home className="w-4 h-4 mr-2" />
            {language === 'nl' ? 'Terug naar verhaal' : language === 'sv' ? 'Tillbaka till sagan' : 'Back to story'}
          </Button>
        </header>

        <section className="book-cover relative overflow-hidden p-6 sm:p-8">
          {heroAvatarUrl && (
            <img
              src={heroAvatarUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-10"
            />
          )}
          <BookOpen className="absolute inset-0 m-auto h-64 w-64 text-primary/10" />
          <div className="relative space-y-6">
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-muted-foreground"
            >
              {language === 'nl'
                ? 'Kies een antwoord dat helpt om het volgende stukje van het verhaal vorm te geven.'
                : language === 'sv'
                ? 'Välj ett svar som hjälper nästa del av sagan.'
                : 'Choose an answer that helps shape what happens next in the story.'}
            </motion.p>

            <div className="grid gap-4 sm:grid-cols-3">
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
            </div>

            <section className="rounded-2xl border border-border/60 bg-card/70 p-5 space-y-2">
              <h2 className="font-medium text-foreground">
                {language === 'nl'
                  ? 'Keuzes voor dit hoofdstuk'
                  : language === 'sv'
                  ? 'Valen hittills'
                  : 'Choices so far'}
              </h2>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  {language === 'nl' ? 'Niveau 1' : language === 'sv' ? 'Nivå 1' : 'Level 1'}: {selections.level1 || '—'}
                </li>
                <li>
                  {language === 'nl' ? 'Niveau 2' : language === 'sv' ? 'Nivå 2' : 'Level 2'}: {selections.level2 || '—'}
                </li>
                <li>
                  {language === 'nl' ? 'Niveau 3' : language === 'sv' ? 'Nivå 3' : 'Level 3'}: {selections.level3 || '—'}
                </li>
              </ul>
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => navigate(`/read/${story.id}`)}>
                {language === 'nl' ? 'Sla over' : language === 'sv' ? 'Hoppa över' : 'Skip for now'}
              </Button>
              <Button onClick={handleContinue} disabled={!hasAllSelections || saving} className="sm:ml-auto">
                {saving
                  ? language === 'nl'
                    ? 'Opslaan...'
                    : language === 'sv'
                    ? 'Sparar...'
                    : 'Saving...'
                  : language === 'nl'
                  ? 'Verder lezen'
                  : language === 'sv'
                  ? 'Fortsätt läsa'
                  : 'Continue reading'}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
