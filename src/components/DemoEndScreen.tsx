import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Moon, Star, Sparkles, Heart, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface DemoEndScreenProps {
  heroName: string;
}

export default function DemoEndScreen({ heroName }: DemoEndScreenProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Generate stable star positions
  const starPositions = [...Array(30)].map((_, i) => ({
    left: `${(i * 17) % 100}%`,
    top: `${(i * 23) % 60}%`,
    duration: 2 + (i % 3),
    delay: (i % 5) * 0.4,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated stars background */}
      {starPositions.map((star, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{ left: star.left, top: star.top }}
          animate={{
            opacity: [0.2, 1, 0.2],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Moon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute top-10 right-10"
      >
        <Moon className="w-20 h-20 text-yellow-200 fill-yellow-100" />
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="relative z-10 text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          className="mb-6"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center border border-white/20 backdrop-blur-sm">
            <Sparkles className="w-12 h-12 text-yellow-300" />
          </div>
        </motion.div>

        <h1 className="font-serif text-4xl md:text-5xl text-white mb-3">
          {t('theEnd')}
        </h1>

        <p className="text-xl text-purple-200 mb-8">
          {t('sleepWell')}, {heroName}!
        </p>

        {/* Star Rating */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <p className="text-sm text-purple-300 mb-3">{t('ratingPrompt')}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-white/30'
                  }`}
                />
              </motion.button>
            ))}
          </div>
          {rating > 0 && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-purple-300 mt-2"
            >
              <Heart className="w-4 h-4 inline mr-1 text-pink-400" />
              {t('ratingSaved')}
            </motion.p>
          )}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="space-y-4"
        >
          <Button
            size="lg"
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {t('createFreeAccount')}
          </Button>

          <p className="text-sm text-purple-300/80">
            Save {heroName}'s adventures and create more magical stories!
          </p>

          <button
            onClick={() => navigate('/')}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors underline underline-offset-4"
          >
            {t('backToLibrary')}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
