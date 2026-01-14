import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MoonStar, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { clearDemoId } from '@/lib/demoStorage';

interface DemoEndScreenProps {
  heroName?: string;
}

export default function DemoEndScreen({ heroName = 'little one' }: DemoEndScreenProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [rating, setRating] = useState<number | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);

  // Generate stable star positions once
  const starPositions = useMemo(() => 
    [...Array(30)].map(() => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 60}%`,
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 2,
    })), []
  );

  const messages = {
    en: {
      enjoyStory: 'Did you enjoy this story?',
      thankYou: 'Thanks! We hope to see you again soon.',
      createAccount: 'Create Free Account',
      backHome: 'Back to Home',
      ctaText: 'Loved this story? Create personalized adventures with your child\'s name and favorite things...',
    },
    nl: {
      enjoyStory: 'Vond je dit verhaal leuk?',
      thankYou: 'Bedankt! We hopen je snel weer te zien.',
      createAccount: 'Maak Gratis Account',
      backHome: 'Terug naar Home',
      ctaText: 'Vond je dit verhaal leuk? Maak gepersonaliseerde avonturen met de naam en favoriete dingen van je kind...',
    },
    sv: {
      enjoyStory: 'Gillade du den här sagan?',
      thankYou: 'Tack! Vi hoppas att se dig igen snart.',
      createAccount: 'Skapa Gratis Konto',
      backHome: 'Tillbaka till Start',
      ctaText: 'Gillade du den här sagan? Skapa personliga äventyr med ditt barns namn och favoritsaker...',
    },
  };

  const msg = messages[language] || messages.en;

  const handleRating = (value: number) => {
    setRating(value);
    // For demo, just show thank you - no DB save needed
    setTimeout(() => {
      setShowThankYou(true);
    }, 500);
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
        {starPositions.map((star, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ 
              duration: star.duration, 
              repeat: Infinity, 
              delay: star.delay 
            }}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: star.left,
              top: star.top,
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
          {t('sleepWell')}, {heroName}
        </motion.p>

        {/* Rating section */}
        {!showThankYou && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full mb-6 rounded-xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-white/80 text-center mb-4">{msg.enjoyStory}</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <motion.button
                  key={value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRating(value)}
                  className="p-2 transition-colors"
                  aria-label={`Rate ${value} stars`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      rating && value <= rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {showThankYou && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4"
          >
            <p className="text-emerald-300 text-center">{msg.thankYou}</p>
          </motion.div>
        )}

        {/* Demo CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full mb-6 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <p className="text-white/80 text-sm italic text-center leading-relaxed">
            {msg.ctaText}
          </p>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="flex flex-col gap-3 w-full"
        >
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => {
                clearDemoId();
                navigate('/auth');
              }}
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
            >
              <Sparkles className="w-5 h-5" />
              {msg.createAccount}
            </Button>
          </motion.div>

          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            {msg.backHome}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
