import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoonStar, Library, Bookmark, Sparkles, Check, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import StarRating from './StarRating';

interface SleepWellScreenProps {
  characterName: string;
  characterId: string;
  storyId: string;
  adventureSummary?: string;
  nextOptions?: string[];
  existingLifeSummary?: string | null;
}

export default function SleepWellScreen({ 
  characterName, 
  characterId,
  storyId,
  adventureSummary, 
  nextOptions,
  existingLifeSummary
}: SleepWellScreenProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);
  const [ratingSaved, setRatingSaved] = useState(false);

  // Build cumulative life summary from existing + new adventure
  const buildCumulativeLifeSummary = (newAdventureSummary: string): string => {
    if (!existingLifeSummary) {
      // First adventure - just use this summary
      return newAdventureSummary;
    }
    
    // Combine: keep it concise (2 sentences max for the life summary)
    // The AI will craft this better, but we do a simple merge here
    const combined = `${existingLifeSummary} ${newAdventureSummary}`;
    
    // If it's getting too long, we just append and let it grow
    // In production, you might want AI to summarize this
    if (combined.length > 300) {
      // Just keep the last 2 adventure summaries worth
      return combined.slice(-300);
    }
    
    return combined;
  };

  const handleRatingChange = async (value: number) => {
    setRating(value);
    setRatingSaving(true);
    setRatingMessage(null);
    setRatingSaved(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('ratingLoginRequired'));
        setRatingSaving(false);
        return;
      }

      type StoryWithOwner = {
        character_id: string;
        characters: { user_id: string } | null;
      };

      const { data: story, error: storyError } = await supabase
        .from('stories')
        .select('character_id, characters!inner(user_id)')
        .eq('id', storyId)
        .eq('characters.user_id', user.id)
        .single<StoryWithOwner>();

      if (storyError || !story || story?.characters?.user_id !== user.id) {
        toast.error(t('ratingOwnerOnly'));
        setRatingSaving(false);
        return;
      }

      // Store rating in story metadata since ratings table doesn't exist
      const { error } = await supabase
        .from('stories')
        .update({ 
          story_state: { rating: value }
        })
        .eq('id', storyId);

      if (error) throw error;

      setRatingMessage(t('ratingSaved'));
      setRatingSaved(true);
    } catch (error) {
      console.error('Error saving rating:', error);
      toast.error(t('ratingSaveFailed'));
    } finally {
      setRatingSaving(false);
    }
  };

  const handleSelectOption = async (option: string) => {
    setSelectedOption(option);
    setSaving(true);

    try {
      // Build cumulative life summary
      const newLifeSummary = adventureSummary 
        ? buildCumulativeLifeSummary(adventureSummary)
        : existingLifeSummary;

      // Update character with pending_choice AND cumulative life summary
      const { error } = await supabase
        .from('characters')
        .update({ 
          pending_choice: option,
          // Store cumulative summary on the character (not story)
          // Note: We need to add this column if it doesn't exist
          // For now, we piggyback on stories.last_summary pattern
        })
        .eq('id', characterId);

      if (error) throw error;

      // Also update the story's last_summary for this adventure
      if (newLifeSummary) {
        await supabase
          .from('stories')
          .update({ last_summary: newLifeSummary })
          .eq('id', storyId);
      }

      toast.success(t('choiceSaved').replace('{name}', characterName));
    } catch (error) {
      console.error('Error saving choice:', error);
      toast.error(t('choiceSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // "Child is asleep" - pick random option, save cumulative summary, and dim screen
  const handlePickForMe = async () => {
    if (!nextOptions || nextOptions.length === 0) {
      navigate('/dashboard');
      return;
    }

    setSaving(true);
    
    // Pick random option
    const randomOption = nextOptions[Math.floor(Math.random() * nextOptions.length)];
    
    try {
      // Build cumulative life summary
      const newLifeSummary = adventureSummary 
        ? buildCumulativeLifeSummary(adventureSummary)
        : existingLifeSummary;

      // Update character with random choice
      const { error } = await supabase
        .from('characters')
        .update({ pending_choice: randomOption })
        .eq('id', characterId);

      if (error) throw error;

      // Update story with cumulative summary
      if (newLifeSummary) {
        await supabase
          .from('stories')
          .update({ last_summary: newLifeSummary })
          .eq('id', storyId);
      }

      // Dim screen to black (Goodnight mode)
      setDimmed(true);
      
      // Wait a moment then navigate silently
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error saving choice:', error);
      setSaving(false);
      navigate('/dashboard');
    }
  };

  // Handle goodnight without option selection
  const handleGoodnight = async () => {
    // Save cumulative summary even if no option selected
    if (adventureSummary) {
      const newLifeSummary = buildCumulativeLifeSummary(adventureSummary);
      await supabase
        .from('stories')
        .update({ last_summary: newLifeSummary })
        .eq('id', storyId);
    }
    
    navigate('/dashboard');
  };

  // Dimmed screen for sleeping child
  if (dimmed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Moon className="w-16 h-16 text-white mx-auto mb-4" />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 0.5 }}
            className="text-white/20 font-serif text-xl"
          >
            {t('sleepWell')}, {characterName}
          </motion.p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: 'linear-gradient(180deg, #1A202C 0%, #2D3748 100%)' }}
    >
      {/* Stars decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              repeat: Infinity, 
              delay: Math.random() * 2 
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60}%`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center">
        {/* Moon icon */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)]">
            <MoonStar className="w-10 h-10 text-amber-900" />
          </div>
        </motion.div>

        {/* The End text */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-serif text-4xl text-white mb-2 text-center"
        >
          {t('theEnd')}
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-lg text-white/70 mb-6 text-center"
        >
          {t('sleepWell')}, {characterName}
        </motion.p>

        {/* Memory box - shows THIS adventure's summary */}
        {adventureSummary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
            className="w-full mb-6 p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
                {t('memorySaved')}
              </span>
            </div>
            <p className="text-sm text-white/80 italic leading-relaxed">
              "{adventureSummary}"
            </p>
          </motion.div>
        )}

        {/* Tomorrow's Adventure - Cliffhanger Options */}
        {nextOptions && nextOptions.length > 0 && !selectedOption && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="w-full mb-6"
          >
            <div className="flex items-center gap-2 mb-4 justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-400 uppercase tracking-wide">
                {t('tomorrowsAdventure')}
              </span>
            </div>
            <p className="text-center text-white/70 text-sm mb-4">
              {t('chooseNextAdventure').replace('{name}', characterName)}
            </p>
            <div className="space-y-3">
              {nextOptions.map((option, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectOption(option)}
                  disabled={saving}
                  className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white text-left hover:bg-white/20 hover:border-amber-400/50 transition-all disabled:opacity-50"
                >
                  <span className="text-amber-400 font-bold mr-2">{index + 1}.</span>
                  {option}
                </motion.button>
              ))}
            </div>

            {/* Pick for me button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-4"
            >
              <Button
                onClick={handlePickForMe}
                variant="ghost"
                size="sm"
                disabled={saving}
                className="w-full text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
              >
                <Moon className="w-4 h-4 mr-2" />
                {t('pickForMe')}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* Choice Saved Confirmation */}
        <AnimatePresence>
          {selectedOption && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                  {t('choiceSaved').replace('{name}', characterName).split('!')[0]}!
                </span>
              </div>
              <p className="text-sm text-white/80 italic leading-relaxed">
                "{selectedOption}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Star rating */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className={`w-full mb-6 rounded-xl border ${ratingSaved ? 'border-emerald-300/60 bg-emerald-500/5 shadow-[0_10px_40px_-30px_rgba(16,185,129,0.8)]' : 'border-white/10 bg-white/5'} p-4`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/80">{t('ratingPrompt')}</span>
            {ratingMessage && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-200" aria-live="polite">
                <Check className="w-3 h-3" />
                {ratingMessage}
              </span>
            )}
          </div>
          <StarRating value={rating} onChange={handleRatingChange} />
          {ratingSaving && (
            <p className="mt-2 text-xs text-white/70">{t('ratingSaving')}</p>
          )}
        </motion.div>

        {/* Goodnight button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: nextOptions?.length ? 1.5 : 1.1 }}
          className="flex flex-col gap-3 w-full"
        >
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleGoodnight}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
            >
              <MoonStar className="w-5 h-5" />
              {t('goodnight')}
            </Button>
          </motion.div>

          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Library className="w-4 h-4 mr-2" />
            {t('backToLibrary')}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
