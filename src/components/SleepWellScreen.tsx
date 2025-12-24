import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoonStar, Library, Bookmark, Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SleepWellScreenProps {
  characterName: string;
  characterId: string;
  adventureSummary?: string;
  nextOptions?: string[];
}

export default function SleepWellScreen({ 
  characterName, 
  characterId,
  adventureSummary, 
  nextOptions 
}: SleepWellScreenProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelectOption = async (option: string) => {
    setSelectedOption(option);
    setSaving(true);

    try {
      const { error } = await supabase
        .from('characters')
        .update({ pending_choice: option })
        .eq('id', characterId);

      if (error) throw error;

      toast.success(t('choiceSaved').replace('{name}', characterName));
    } catch (error) {
      console.error('Error saving choice:', error);
      toast.error('Failed to save choice');
    } finally {
      setSaving(false);
    }
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
          className="text-lg text-white/70 mb-6 text-center"
        >
          {t('sleepWell')}, {characterName}
        </motion.p>

        {/* Memory box */}
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

        {/* Goodnight button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: nextOptions?.length ? 1.5 : 1.1 }}
          className="flex flex-col gap-3 w-full"
        >
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => navigate('/dashboard')}
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