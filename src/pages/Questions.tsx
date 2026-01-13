import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Home, UserCircle, Sparkles, Loader2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import AdaptiveQuestions from '@/components/AdaptiveQuestions';
import { useAdaptiveQuestions } from '@/hooks/useAdaptiveQuestions';

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

type StoryState = {
  location?: string | null;
  inventory?: string[];
  plot_outline?: string[];
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
    };
  }

  return {
    location: storyState.location ?? null,
    inventory: Array.isArray(storyState.inventory) ? storyState.inventory : [],
    plot_outline: Array.isArray(storyState.plot_outline) ? storyState.plot_outline : [],
  };
};

export default function Questions() {
  const { storyId: storyIdParam, characterId } = useParams<{ storyId?: string; characterId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [createdStoryId, setCreatedStoryId] = useState<string | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [questions, setQuestions] = useState<ThreeLevelQuestions | null>(null);
  const [currentLevel, setCurrentLevel] = useState<1 | 2 | 3>(1);
  const [selections, setSelections] = useState<SelectionState>({});
  const [saving, setSaving] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [usedAiQuestions, setUsedAiQuestions] = useState(false);
  const [isUsingAdaptiveQuestions, setIsUsingAdaptiveQuestions] = useState(false);
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<string, string>>({});

  const storyId = storyIdParam || searchParams.get('storyId') || createdStoryId || undefined;
  const lengthSetting = searchParams.get('length');

  useEffect(() => {
    if (storyId || !characterId) return;

    const createStory = async () => {
      setIsCreatingStory(true);

      const length =
        lengthSetting === 'SHORT' || lengthSetting === 'MEDIUM' || lengthSetting === 'LONG'
          ? lengthSetting
          : 'SHORT';

      try {
        await supabase.from('stories').update({ is_active: false }).eq('character_id', characterId);

        const { data: newStory, error } = await supabase
          .from('stories')
          .insert({
            character_id: characterId,
            length_setting: length,
            is_active: true,
          })
          .select()
          .single();

        if (error || !newStory) {
          throw error || new Error('Story creation failed');
        }

        setCreatedStoryId(newStory.id);
      } catch (error) {
        console.error('[Questions] Failed to create story:', error);
        toast.error(
          language === 'nl'
            ? 'De verhaalmagie rust even. Probeer het straks opnieuw.'
            : language === 'sv'
            ? 'Sagomagin vilar en stund. Försök igen snart.'
            : 'Story magic is resting. Please try again soon.',
        );
        navigate('/dashboard');
      } finally {
        setIsCreatingStory(false);
      }
    };

    createStory();
  }, [storyId, characterId, lengthSetting, language, navigate]);

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
      age_band?: string;
      traits?: string[] | null;
      preferred_themes?: string[] | null;
      last_summary?: string | null;
      hero_image_url?: string | null;
      sidekick_name?: string | null;
    };

    return {
      heroName: character.name,
      heroType: character.archetype || 'friend',
      heroTrait: character.traits?.[0] || 'Kind',
      ageBand: character.age_band || '3-5',
      traits: character.traits || [],
      comfortItem: 'blanket',
      sidekickName: character.sidekick_name || null,
      lastSummary: character.last_summary || 'None (first episode).',
      topTags: (character.preferred_themes as string[]) || [],
      supabaseCharacterId: character.id,
    };
  }, [story?.characters]);

  const heroPortrait = useSignedImageUrl({
    initialUrl: story?.characters?.hero_image_url,
    heroId: story?.characters?.id,
  });

  // Generate AI-powered questions for authenticated users
  const generateAiQuestions = useCallback(async () => {
    if (!heroProfile) return null;

    try {
      console.log('[Questions] Generating AI questions for:', heroProfile.heroName);
      
      const response = await supabase.functions.invoke('generate-questions', {
        body: {
          heroName: heroProfile.heroName,
          heroType: heroProfile.heroType,
          ageBand: heroProfile.ageBand,
          traits: heroProfile.traits,
          comfortItem: heroProfile.comfortItem,
          sidekickName: heroProfile.sidekickName,
          lastSummary: heroProfile.lastSummary,
          topTags: heroProfile.topTags,
          language,
        },
      });

      if (response.error) {
        console.error('[Questions] AI generation error:', response.error);
        return null;
      }

      const aiQuestions = response.data as ThreeLevelQuestions;
      
      if (!validateThreeLevelQuestions(aiQuestions)) {
        console.error('[Questions] AI questions validation failed');
        return null;
      }

      console.log('[Questions] AI questions generated successfully');
      return aiQuestions;
    } catch (error) {
      console.error('[Questions] Failed to generate AI questions:', error);
      return null;
    }
  }, [heroProfile, language]);

  // Fallback to static questions
  const getStaticQuestions = useCallback(() => {
    if (!heroProfile) return null;

    const questionContext = generateQuestionsContext(
      heroProfile,
      heroProfile.lastSummary,
      heroProfile.topTags,
      language,
    );
    const staticQuestions = createThreeLevelQuestions(questionContext);
    
    if (validateThreeLevelQuestions(staticQuestions)) {
      return staticQuestions;
    }
    return null;
  }, [heroProfile, language]);

  // Try adaptive questions first
  const { data: adaptiveQuestionsData, isLoading: isLoadingAdaptive } = useAdaptiveQuestions(
    story?.characters?.id
  );

  useEffect(() => {
    if (!heroProfile || questions) return;

    const loadQuestions = async () => {
      setIsGeneratingQuestions(true);

      try {
        // Try adaptive questions first (new system)
        if (adaptiveQuestionsData?.questions && adaptiveQuestionsData.questions.length > 0) {
          console.log('[Questions] Using adaptive questions');
          setIsUsingAdaptiveQuestions(true);
          setUsedAiQuestions(true);
          setIsGeneratingQuestions(false);
          return;
        }

        // Fall back to 3-level AI questions
        console.log('[Questions] Trying 3-level AI questions');
        const aiQuestions = await generateAiQuestions();
        
        if (aiQuestions) {
          setQuestions(aiQuestions);
          setIsUsingAdaptiveQuestions(false);
          setUsedAiQuestions(true);
          setIsGeneratingQuestions(false);
          return;
        }

        // Fall back to static questions
        console.log('[Questions] Falling back to static questions');
        const staticQuestions = getStaticQuestions();
        
        if (staticQuestions) {
          setQuestions(staticQuestions);
          setIsUsingAdaptiveQuestions(false);
          setUsedAiQuestions(false);
        } else {
          toast.error(
            language === 'nl'
              ? 'Vanavond kunnen we de vragen niet laden.'
              : language === 'sv'
              ? 'Vi kunde inte ladda kvällens frågor.'
              : "Unable to load tonight's questions.",
          );
        }
      } catch (error) {
        console.error('[Questions] Question loading failed:', error);
        // Last resort fallback
        const staticQuestions = getStaticQuestions();
        if (staticQuestions) {
          setQuestions(staticQuestions);
          setIsUsingAdaptiveQuestions(false);
          setUsedAiQuestions(false);
        }
      } finally {
        setIsGeneratingQuestions(false);
      }
    };

    // Wait for adaptive questions to load or fail
    if (isLoadingAdaptive) {
      setIsGeneratingQuestions(true);
      return;
    }

    loadQuestions();
  }, [heroProfile, questions, generateAiQuestions, getStaticQuestions, language, adaptiveQuestionsData, isLoadingAdaptive]);

  // Loading state while generating questions
  if (isCreatingStory) {
    return (
      <div className="min-h-screen bg-background paper-texture">
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          <header className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-64" />
            </div>
          </header>

          <div className="book-cover relative overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-center"
              >
                {language === 'nl'
                  ? 'Verhaal klaarmaken...'
                  : language === 'sv'
                  ? 'Förbereder berättelse...'
                  : 'Preparing your story...'}
              </motion.p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Define handleAdaptiveComplete before conditional returns that use it
  const handleAdaptiveComplete = async (answers: Record<string, string>) => {
    if (!story) return;

    console.log('[Questions] Adaptive answers received:', answers);
    setAdaptiveAnswers(answers);
    setSaving(true);

    try {
      // Extract story length from answers and map to database format
      const lengthValue = answers.story_length?.toLowerCase() || 'medium';
      const storyLength = lengthValue === 'short' ? 'SHORT' : lengthValue === 'long' ? 'LONG' : 'MEDIUM';
      console.log('[Questions] Extracted story length:', storyLength);
      
      // Update story with length setting
      const storyState = normalizeStoryState(story.story_state as StoryState);
      const selectionSummary = `Adaptive question answers: ${JSON.stringify(answers)}`;
      const updatedStoryState: StoryState = {
        ...storyState,
        plot_outline: storyState.plot_outline?.includes(selectionSummary)
          ? storyState.plot_outline
          : [...(storyState.plot_outline || []), selectionSummary],
      };

      // Extract tags from adaptive question answers (if available)
      // The adaptive questions return question_types: story_length, setting, theme
      const selectionTags: string[] = [];
      if (answers.setting) selectionTags.push(answers.setting);
      if (answers.theme) selectionTags.push(answers.theme);
      // Add any other answer values as tags (excluding story_length which is not a theme)
      Object.entries(answers).forEach(([key, value]) => {
        if (key !== 'story_length' && !selectionTags.includes(value)) {
          selectionTags.push(value);
        }
      });

      const character = story.characters as { id: string; preferred_themes?: string[] | null };
      const currentPreferred = (character.preferred_themes as string[]) || [];
      const updatedPreferred = Array.from(new Set([...currentPreferred, ...selectionTags])).slice(-10);

      console.log('[Questions] Selection tags extracted:', selectionTags);
      console.log('[Questions] Updated preferred themes:', updatedPreferred);

      await Promise.all([
        supabase
          .from('stories')
          .update({
            story_state: updatedStoryState,
            length_setting: storyLength === 'SHORT' ? 'SHORT' : storyLength === 'LONG' ? 'LONG' : 'MEDIUM',
          })
          .eq('id', story.id),
        supabase.from('characters').update({ preferred_themes: updatedPreferred }).eq('id', character.id),
      ]);

      console.log('[Questions] Story and character updated, starting page generation');

      // Start generating page 1 in background - don't await
      supabase.functions.invoke('generate-page', {
        body: { storyId: story.id, targetPage: 1 },
      }).catch(err => console.error('Background page generation error:', err));

      // Navigate immediately - Reader will poll for page 1
      console.log('[Questions] Navigating to reader:', story.id);
      navigate(`/read/${story.id}`);
    } catch (error) {
      console.error('Failed to save adaptive question answers', error);
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

  if (!story || !heroProfile) {
    return null;
  }

  // Show adaptive questions if available
  if (isUsingAdaptiveQuestions && adaptiveQuestionsData?.questions) {
    return (
      <div className="min-h-screen bg-background paper-texture">
        <main id="main-content" className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/30 shadow-sm">
                <AvatarImage src={heroPortrait.url || story?.characters?.hero_image_url || undefined} alt={`${heroProfile.heroName} portrait`} />
                <AvatarFallback className="text-primary">
                  <UserCircle className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    <Sparkles className="h-3 w-3" />
                    {language === 'nl' ? 'Gepersonaliseerd' : language === 'sv' ? 'Personlig' : 'Personalized'}
                  </span>
                </div>
                <h1 className="text-2xl font-serif font-semibold text-foreground">
                  {language === 'nl' ? 'Vorm je verhaal' : language === 'sv' ? 'Forma din berättelse' : 'Shape Your Story'}
                </h1>
              </div>
            </div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <Home className="w-4 h-4 mr-2" />
              {language === 'nl' ? 'Terug naar Dashboard' : language === 'sv' ? 'Tillbaka till Dashboard' : 'Back to Dashboard'}
            </Button>
          </header>

          <AdaptiveQuestions
            characterId={story.characters.id}
            onComplete={handleAdaptiveComplete}
            loading={saving}
          />
        </main>
      </div>
    );
  }

  if (isGeneratingQuestions || !questions) {
    return (
      <div className="min-h-screen bg-background paper-texture">
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
          <header className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-64" />
            </div>
          </header>

          <div className="book-cover relative overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3"
              >
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-center"
              >
                {language === 'nl'
                  ? `Magische vragen maken voor ${heroProfile.heroName}...`
                  : language === 'sv'
                  ? `Skapar magiska frågor för ${heroProfile.heroName}...`
                  : `Creating magical questions for ${heroProfile.heroName}...`}
              </motion.p>
            </div>
          </div>
        </main>
      </div>
    );
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
      const selectionSummary = `Question choices before story: ${selections.level1} / ${selections.level2} / ${selections.level3}`;
      const updatedStoryState: StoryState = {
        ...storyState,
        plot_outline: storyState.plot_outline?.includes(selectionSummary)
          ? storyState.plot_outline
          : [...(storyState.plot_outline || []), selectionSummary],
      };

      const character = story.characters as { id: string; preferred_themes?: string[] | null };
      const currentPreferred = (character.preferred_themes as string[]) || [];
      const updatedPreferred = Array.from(new Set([...currentPreferred, ...selectionTags])).slice(-10);

      await Promise.all([
        supabase.from('stories').update({ story_state: updatedStoryState }).eq('id', story.id),
        supabase.from('characters').update({ preferred_themes: updatedPreferred }).eq('id', character.id),
      ]);

      // Start generating page 1 in background - don't await
      supabase.functions.invoke('generate-page', {
        body: { storyId: story.id, targetPage: 1 },
      }).catch(err => console.error('Background page generation error:', err));

      // Navigate immediately - Reader will poll for page 1
      navigate(`/read/${story.id}`);
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
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {language === 'nl'
                    ? `${levelLabels.nl} ${currentLevel} van 3`
                    : language === 'sv'
                    ? `${levelLabels.sv} ${currentLevel} av 3`
                    : `${levelLabels.en} ${currentLevel} of 3`}
                </p>
                {usedAiQuestions && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    <Sparkles className="h-3 w-3" />
                    {language === 'nl' ? 'Gepersonaliseerd' : language === 'sv' ? 'Personlig' : 'Personalized'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                {currentQuestion.question}
              </h1>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <Home className="w-4 h-4 mr-2" />
            {language === 'nl' ? 'Terug naar Dashboard' : language === 'sv' ? 'Tillbaka till Dashboard' : 'Back to Dashboard'}
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
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                {language === 'nl' ? 'Annuleren' : language === 'sv' ? 'Avbryt' : 'Cancel'}
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
