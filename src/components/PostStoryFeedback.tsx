import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';

type ChildState = 'calmer' | 'same' | 'more_energetic';
type ReuseIntent = 'yes' | 'maybe' | 'no';

interface PostStoryFeedbackProps {
  storyId: string;
  onComplete: () => void;
}

export default function PostStoryFeedback({ storyId, onComplete }: PostStoryFeedbackProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [childState, setChildState] = useState<ChildState | null>(null);
  const [reuseIntent, setReuseIntent] = useState<ReuseIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  const saveFeedback = async () => {
    // Only save if at least one answer provided
    if (!childState && !reuseIntent) {
      onComplete();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('stories')
        .update({
          child_state_after_story: childState,
          reuse_intent_tomorrow: reuseIntent,
          feedback_submitted_at: new Date().toISOString(),
        })
        .eq('id', storyId);

      if (updateError) throw updateError;

      setShowThankYou(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error('Error saving feedback:', err);
      setError(t('feedbackSaveError'));
      setSaving(false);
    }
  };

  const handleChildStateSelect = (state: ChildState) => {
    setChildState(state);
    setStep(2);
  };

  const handleReuseIntentSelect = (intent: ReuseIntent) => {
    setReuseIntent(intent);
    saveFeedback();
  };

  const handleSkip = () => {
    if (step === 1) {
      setStep(2);
    } else {
      saveFeedback();
    }
  };

  // Thank you screen
  if (showThankYou) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4"
        >
          <Check className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <p className="text-white/80 text-lg">{t('feedbackThankYou')}</p>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-amber-400' : 'bg-white/30'}`} />
        <div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-amber-400' : 'bg-white/30'}`} />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-medium text-white text-center mb-6">
              {t('feedbackQuestion1')}
            </h3>

            <div className="space-y-3">
              <FeedbackButton
                onClick={() => handleChildStateSelect('calmer')}
                emoji="😌"
                label={t('feedbackCalmer')}
              />
              <FeedbackButton
                onClick={() => handleChildStateSelect('same')}
                emoji="😐"
                label={t('feedbackSame')}
              />
              <FeedbackButton
                onClick={() => handleChildStateSelect('more_energetic')}
                emoji="⚡"
                label={t('feedbackMoreEnergetic')}
              />
            </div>

            <Button
              variant="ghost"
              onClick={handleSkip}
              className="w-full text-white/50 hover:text-white hover:bg-white/10 mt-4"
            >
              {t('feedbackSkip')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-medium text-white text-center mb-6">
              {t('feedbackQuestion2')}
            </h3>

            <div className="space-y-3">
              <FeedbackButton
                onClick={() => handleReuseIntentSelect('yes')}
                emoji="👍"
                label={t('feedbackYes')}
                disabled={saving}
              />
              <FeedbackButton
                onClick={() => handleReuseIntentSelect('maybe')}
                emoji="🤔"
                label={t('feedbackMaybe')}
                disabled={saving}
              />
              <FeedbackButton
                onClick={() => handleReuseIntentSelect('no')}
                emoji="👎"
                label={t('feedbackNo')}
                disabled={saving}
              />
            </div>

            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={saving}
              className="w-full text-white/50 hover:text-white hover:bg-white/10 mt-4"
            >
              {saving ? t('saving') : t('feedbackSkip')}
              {!saving && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message with retry */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-400/50"
        >
          <p className="text-sm text-red-200 text-center mb-2">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveFeedback()}
              className="text-white hover:bg-white/10"
            >
              {t('feedbackRetry')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onComplete}
              className="text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 mr-1" />
              {t('feedbackClose')}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface FeedbackButtonProps {
  onClick: () => void;
  emoji: string;
  label: string;
  disabled?: boolean;
}

function FeedbackButton({ onClick, emoji, label, disabled }: FeedbackButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white text-left hover:bg-white/20 hover:border-amber-400/50 transition-all disabled:opacity-50 flex items-center gap-4"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-lg">{label}</span>
    </motion.button>
  );
}
