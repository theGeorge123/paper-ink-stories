import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoonStar, Library, Check, Moon } from 'lucide-react';
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
  ageBand?: string | null;
}

export default function SleepWellScreen({
  characterName,
  characterId,
  storyId,
  ageBand,
}: SleepWellScreenProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [dimmed, setDimmed] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingMessage, setRatingMessage] = useState<string | null>(null);
  const [ratingSaved, setRatingSaved] = useState(false);

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

  // Handle goodnight without option selection
  const handleGoodnight = async () => {
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


        {/* Star rating */}
        {ageBand !== '1-2' && (
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
            <StarRating value={rating} onChange={handleRatingChange} label="" />
            {ratingSaving && (
              <p className="mt-2 text-xs text-white/70">{t('ratingSaving')}</p>
            )}
          </motion.div>
        )}

        {ageBand === '7-9' && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            className="text-center text-white/60 mb-4"
          >
            {t('tomorrowCanWait')}
          </motion.p>
        )}

          {/* Goodnight button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
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
