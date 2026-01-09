import { useState } from 'react';
import { motion } from 'framer-motion';
import { MoonStar, Library, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import PostStoryFeedback from './PostStoryFeedback';

interface SleepWellScreenProps {
  characterName: string;
  characterId: string;
  storyId: string;
  adventureSummary?: string;
  existingLifeSummary?: string | null;
  storyThemes?: string[];
  onStartNextStory?: () => void;
}

export default function SleepWellScreen({ 
  characterName, 
  characterId,
  storyId,
  adventureSummary, 
  existingLifeSummary,
  storyThemes = [],
  onStartNextStory,
}: SleepWellScreenProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showFeedback, setShowFeedback] = useState(false);

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

  // Learn from this story - add themes to preferred list
  const updatePreferredThemes = async () => {
    if (storyThemes.length === 0) return;
    
    try {
      // Fetch current preferences
      const { data: character } = await supabase
        .from('characters')
        .select('preferred_themes')
        .eq('id', characterId)
        .single();
      
      const currentPreferred = (character?.preferred_themes as string[]) || [];
      
      // Merge themes, keeping unique and limiting to last 10
      const updatedPreferred = [...new Set([...currentPreferred, ...storyThemes])].slice(-10);
      
      await supabase
        .from('characters')
        .update({ preferred_themes: updatedPreferred })
        .eq('id', characterId);
    } catch (error) {
      console.error('Error updating preferred themes:', error);
    }
  };

  // Handle goodnight - save summary and navigate
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
          className="text-lg text-white/70 mb-8 text-center"
        >
          {t('sleepWell')}, {characterName}
        </motion.p>

        {/* Post-story feedback questionnaire */}
        {!showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full mb-6 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <PostStoryFeedback 
              storyId={storyId} 
              onComplete={() => setShowFeedback(true)} 
            />
          </motion.div>
        )}

        {/* Goodnight button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="flex flex-col gap-3 w-full"
        >
          {onStartNextStory && (
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={onStartNextStory}
                size="lg"
                variant="outline"
                className="w-full gap-2 border-white/20 text-white hover:bg-white/10"
              >
                <Sparkles className="w-5 h-5" />
                {t('newAdventure')}
              </Button>
            </motion.div>
          )}
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
