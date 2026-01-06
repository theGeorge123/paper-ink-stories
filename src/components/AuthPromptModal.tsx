import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Heart, Brain, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGuestMode } from '@/hooks/useGuestMode';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/lib/i18n';

const BENEFITS: { icon: React.ElementType; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: Heart, titleKey: 'authBenefitSave', descKey: 'authBenefitSaveDesc' },
  { icon: Brain, titleKey: 'authBenefitMemory', descKey: 'authBenefitMemoryDesc' },
  { icon: Sparkles, titleKey: 'authBenefitPersonalize', descKey: 'authBenefitPersonalizeDesc' },
];

export default function AuthPromptModal() {
  const navigate = useNavigate();
  const { authPromptOpen, authPromptAction, closeAuthPrompt } = useGuestMode();
  const { t } = useLanguage();

  const handleSignUp = () => {
    closeAuthPrompt();
    navigate('/auth');
  };

  const handleLogin = () => {
    closeAuthPrompt();
    navigate('/auth');
  };

  return (
    <Dialog open={authPromptOpen} onOpenChange={(open) => !open && closeAuthPrompt()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="font-serif text-2xl">
            {t('authPromptTitle')}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {t('authPromptSubtitle', { action: authPromptAction })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {BENEFITS.map(({ icon: Icon, titleKey, descKey }) => (
            <motion.div
              key={titleKey}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">{t(titleKey)}</p>
                <p className="text-xs text-muted-foreground">{t(descKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={handleSignUp} size="lg" className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('createFreeAccount')}
          </Button>
          <Button onClick={handleLogin} variant="outline" size="lg" className="w-full">
            {t('login')}
          </Button>
          <button
            onClick={closeAuthPrompt}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('continueBrowsing')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
