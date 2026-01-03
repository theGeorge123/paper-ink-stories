import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Moon, Stars, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/lib/i18n';

interface LengthSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (length: 'SHORT' | 'MEDIUM' | 'LONG') => void;
  characterName: string;
  ageBand?: string;
  loading?: boolean;
}

const LENGTH_OPTIONS = [
  {
    value: 'SHORT' as const,
    key: 'storyLengthShort' as TranslationKey,
    descKey: 'storyLengthShortDescFun' as TranslationKey,
    icon: '🌙',
    recommended: false,
  },
  {
    value: 'MEDIUM' as const,
    key: 'storyLengthMedium' as TranslationKey,
    descKey: 'storyLengthMediumDescFun' as TranslationKey,
    icon: '✨',
    recommended: true,
  },
  {
    value: 'LONG' as const,
    key: 'storyLengthLong' as TranslationKey,
    descKey: 'storyLengthLongDescFun' as TranslationKey,
    icon: '🌟',
    recommended: false,
  },
];

export default function LengthSelectModal({ 
  open, 
  onOpenChange, 
  onSelect, 
  characterName,
  ageBand,
  loading 
}: LengthSelectModalProps) {
  const { t } = useLanguage();
  const hasAutoSelectedRef = useRef(false);

  // For ages 1-2, auto-select SHORT immediately (shouldn't reach here but just in case)
  useEffect(() => {
    if (ageBand === '1-2' && open && !loading && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      onSelect('SHORT');
    }
    // Reset when modal closes
    if (!open) {
      hasAutoSelectedRef.current = false;
    }
  }, [ageBand, open, loading, onSelect]);

  // Don't render the modal for ages 1-2
  if (ageBand === '1-2') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-sm">
        <DialogHeader>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Moon className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
          <DialogTitle className="font-serif text-2xl text-center">
            {t('storyLengthTitle')}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-base">
            {t('storyLengthDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {LENGTH_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !loading && onSelect(option.value)}
              disabled={loading}
              className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                option.recommended 
                  ? 'bg-primary/10 border-primary/50 hover:border-primary hover:bg-primary/20 shadow-lg shadow-primary/10' 
                  : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <motion.div 
                className="text-4xl"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
              >
                {option.icon}
              </motion.div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-serif font-medium text-lg text-foreground">
                    {t(option.key)}
                  </h4>
                  {option.recommended && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1"
                    >
                      <Stars className="w-3 h-3" />
                      {t('storyLengthRecommended')}
                    </motion.span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(option.descKey)}
                </p>
              </div>
              <BookOpen className="w-5 h-5 text-muted-foreground/50" />
            </motion.button>
          ))}
        </div>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center pt-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"
            />
            <p className="text-sm text-muted-foreground font-medium">
              {t('turningPage')}
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
