import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Clock, Heart, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

const WELCOME_KEY = 'paperink-welcome-seen';

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const seen = localStorage.getItem(WELCOME_KEY);
    if (!seen) {
      // Small delay so the page has time to load
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(WELCOME_KEY, 'true');
    setOpen(false);
  };

  const isNL = language === 'nl';

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-0 bg-gradient-to-b from-background to-muted/30">
        <VisuallyHidden.Root>
          <DialogTitle>Welcome to PaperInk</DialogTitle>
          <DialogDescription>Magical bedtime stories, personalized for your child</DialogDescription>
        </VisuallyHidden.Root>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-serif text-2xl font-bold text-center text-foreground mb-2"
          >
            {isNL ? 'Welkom bij PaperInk!' : 'Welcome to PaperInk!'}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center text-muted-foreground text-sm mb-8"
          >
            {isNL
              ? 'Magische slaapverhaaltjes, speciaal voor jouw kind'
              : 'Magical bedtime stories, personalized for your child'}
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 mb-8"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isNL ? 'Unieke verhalen' : 'Unique stories'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isNL
                    ? 'Elk verhaal wordt speciaal voor jouw held geschreven'
                    : 'Every story is written just for your hero'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isNL ? 'Beta versie' : 'Beta version'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isNL
                    ? 'Sommige dingen kunnen even duren - de magie heeft tijd nodig!'
                    : 'Some things may take a moment - magic needs time!'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                <Heart className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isNL ? 'Leert van jullie' : 'Learns from you'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isNL
                    ? 'Hoe meer verhalen, hoe beter ze worden!'
                    : 'The more stories you read, the better they get!'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleClose}
              className="w-full h-12 rounded-xl text-base"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isNL ? 'Begin het avontuur!' : "Let's start!"}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
