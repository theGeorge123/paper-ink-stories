import { motion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKey } from '@/lib/i18n';
import { getPageRangeLabel } from '@/lib/storyEngine';

interface LengthSelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (length: 'SHORT' | 'MEDIUM' | 'LONG') => void;
  characterName: string;
  loading?: boolean;
}

const LENGTH_OPTIONS = [
  {
    value: 'SHORT' as const,
    key: 'storyLengthShort' as TranslationKey,
    descKey: 'storyLengthShortDesc' as TranslationKey,
    pages: getPageRangeLabel('SHORT'),
    icon: '🌙',
    recommended: false
  },
  {
    value: 'MEDIUM' as const,
    key: 'storyLengthMedium' as TranslationKey,
    descKey: 'storyLengthMediumDesc' as TranslationKey,
    pages: getPageRangeLabel('MEDIUM'),
    icon: '✨',
    recommended: true
  },
  {
    value: 'LONG' as const,
    key: 'storyLengthLong' as TranslationKey,
    descKey: 'storyLengthLongDesc' as TranslationKey,
    pages: getPageRangeLabel('LONG'),
    icon: '🌟',
    recommended: false
  },
];

export default function LengthSelectModal({ 
  open, 
  onOpenChange, 
  onSelect, 
  characterName,
  loading 
}: LengthSelectModalProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-sm">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="font-serif text-xl text-center">
            {t('storyLengthTitle')}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Choose how long {characterName}'s adventure will be tonight
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          {LENGTH_OPTIONS.map((option, index) => (
            <motion.button
              key={option.value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !loading && onSelect(option.value)}
              disabled={loading}
              className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed ${
                option.recommended 
                  ? 'bg-primary/10 border-primary/50 hover:border-primary hover:bg-primary/20' 
                  : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className="text-2xl">{option.icon}</div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">
                    {t(option.key)}
                  </h4>
                  {option.recommended && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(option.descKey)} • around {option.pages} pages
                </p>
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
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
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"
            />
            <p className="text-sm text-muted-foreground">
              Starting {characterName}'s adventure...
            </p>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
