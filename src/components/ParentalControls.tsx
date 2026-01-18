import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Globe, X, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/lib/i18n';

const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
];

interface ParentalControlsProps {
  trigger: React.ReactNode;
}

export default function ParentalControls({ trigger }: ParentalControlsProps) {
  const [open, setOpen] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isHolding && holdProgress < 100) {
      interval = setInterval(() => {
        setHoldProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            setUnlocked(true);
            setOpen(true);
            setIsHolding(false);
            return 0;
          }
          return newProgress;
        });
      }, 50);
    } else if (!isHolding) {
      setHoldProgress(0);
    }

    return () => clearInterval(interval);
  }, [isHolding, holdProgress]);

  const handlePointerDown = () => {
    setIsHolding(true);
  };

  const handlePointerUp = () => {
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleClose = () => {
    setOpen(false);
    setUnlocked(false);
  };

  return (
    <>
      {/* Trigger with long-press detection */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative cursor-pointer select-none"
        role="button"
        aria-label={t('parentalControlsLabel')}
        tabIndex={0}
      >
        {trigger}
        
        {/* Progress ring overlay */}
        {isHolding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg className="w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <motion.circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (holdProgress / 100) * 125.6}
              />
            </svg>
          </motion.div>
        )}
      </div>

      {/* Parental Controls Panel */}
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="glass">
          <SheetHeader>
            <SheetTitle className="font-serif flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {t('parentalControlsTitle')}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-8 space-y-8">
            {/* Language Section */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
                <Globe className="w-4 h-4" />
                {t('language')}
              </div>
              
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 bg-muted/30 hover:border-border'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        {lang.code.toUpperCase()}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t('languageAppliesNote')}
              </p>
            </div>

            {/* Info */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                {t('parentalControlsComingSoon')}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}