import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useLanguage } from '@/hooks/useLanguage';
import { Language } from '@/lib/i18n';

const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
];

export default function SettingsMenu() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </Button>
        </motion.div>
      </SheetTrigger>
      <SheetContent className="glass">
        <SheetHeader>
          <SheetTitle className="font-serif flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('settings')}
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 space-y-6">
          {/* Language Section */}
          <div>
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-muted-foreground">
              <Globe className="w-4 h-4" />
              {t('language')}
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {LANGUAGES.map((lang) => (
                <motion.button
                  key={lang.code}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all ${
                    language === lang.code
                      ? 'bg-primary/10 border-2 border-primary text-primary'
                      : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="ml-auto w-2 h-2 rounded-full bg-primary"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}