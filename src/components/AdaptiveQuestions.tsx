import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdaptiveQuestions, type AdaptiveQuestion, type AdaptiveQuestionOption } from '@/hooks/useAdaptiveQuestions';
import { Skeleton } from '@/components/ui/skeleton';

interface AdaptiveQuestionsProps {
  characterId: string;
  onComplete: (answers: Record<string, string>) => void;
  loading?: boolean;
}

function QuestionCard({
  question,
  options,
  onSelect,
  selectedValue,
  currentStep,
  totalSteps,
}: {
  question: AdaptiveQuestion;
  options: AdaptiveQuestionOption[];
  onSelect: (value: string) => void;
  selectedValue?: string;
  currentStep: number;
  totalSteps: number;
}) {
  const { language } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`h-2 flex-1 rounded-full transition-all ${
              idx < currentStep - 1
                ? 'bg-primary'
                : idx === currentStep - 1
                ? 'bg-primary animate-pulse'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div>
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
          {question.question_text}
        </h2>
        <p className="text-sm text-muted-foreground">
          {language === 'nl'
            ? 'Kies een antwoord om je verhaal vorm te geven'
            : language === 'sv'
            ? 'Välj ett svar för att forma din berättelse'
            : 'Choose an answer to shape your story'}
        </p>
      </div>

      {/* Options */}
      <div className="grid gap-3">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <motion.button
              key={option.value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(option.value)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-lg'
                  : 'border-border hover:border-primary/50 bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                {option.icon && (
                  <span className="text-2xl flex-shrink-0">{option.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{option.label}</h3>
                    {option.recommended && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                        {language === 'nl' ? 'Aanbevolen' : language === 'sv' ? 'Rekommenderad' : 'Recommended'}
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  )}
                  {option.estimated_time && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{option.estimated_time}</span>
                    </div>
                  )}
                </div>
                {isSelected && (
                  <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function AdaptiveQuestions({ characterId, onComplete, loading: externalLoading }: AdaptiveQuestionsProps) {
  const { data: questionsData, isLoading, error } = useAdaptiveQuestions(characterId);
  const { language } = useLanguage();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions = questionsData?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLoadingQuestions = isLoading || externalLoading;

  const handleAnswer = (value: string) => {
    const newAnswers = { ...answers, [currentQuestion.question_type]: value };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions answered
      onComplete(newAnswers);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      // Remove answer for the question we're going back to
      const prevQuestion = questions[currentQuestionIndex - 1];
      if (prevQuestion) {
        const newAnswers = { ...answers };
        delete newAnswers[prevQuestion.question_type];
        setAnswers(newAnswers);
      }
    }
  };

  if (isLoadingQuestions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !questions.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {language === 'nl'
            ? 'Kon vragen niet laden. Probeer het opnieuw.'
            : language === 'sv'
            ? 'Kunde inte ladda frågor. Försök igen.'
            : 'Unable to load questions. Please try again.'}
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          {language === 'nl' ? 'Opnieuw proberen' : language === 'sv' ? 'Försök igen' : 'Try Again'}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {currentQuestion && (
          <QuestionCard
            key={currentQuestionIndex}
            question={currentQuestion}
            options={currentQuestion.options}
            onSelect={handleAnswer}
            selectedValue={answers[currentQuestion.question_type]}
            currentStep={currentQuestionIndex + 1}
            totalSteps={questions.length}
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentQuestionIndex === 0}
        >
          {language === 'nl' ? '← Terug' : language === 'sv' ? '← Tillbaka' : '← Back'}
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          <span>
            {language === 'nl'
              ? 'Gepersonaliseerd'
              : language === 'sv'
              ? 'Personlig'
              : 'Personalized'}
          </span>
        </div>

        <div className="text-sm text-muted-foreground">
          {currentQuestionIndex + 1} / {questions.length}
        </div>
      </div>
    </div>
  );
}
