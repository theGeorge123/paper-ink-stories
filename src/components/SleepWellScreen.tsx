import { motion } from 'framer-motion';
import { MoonStar, Library, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SleepWellScreenProps {
  characterName: string;
  adventureSummary?: string;
}

export default function SleepWellScreen({ characterName, adventureSummary }: SleepWellScreenProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(180deg, #1A202C 0%, #2D3748 100%)' }}
    >
      {/* Stars decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
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

      {/* Moon icon */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-200 to-amber-400 flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.4)]">
          <MoonStar className="w-12 h-12 text-amber-900" />
        </div>
      </motion.div>

      {/* The End text */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="font-serif text-4xl text-white mb-3 text-center"
      >
        The End
      </motion.h1>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-lg text-white/70 mb-8 text-center"
      >
        Sleep well, {characterName}
      </motion.p>

      {/* Memory box */}
      {adventureSummary && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="max-w-sm w-full mb-10 p-4 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wide">
              Memory Saved
            </span>
          </div>
          <p className="text-sm text-white/80 italic leading-relaxed">
            "{adventureSummary}"
          </p>
        </motion.div>
      )}

      {/* Goodnight button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <motion.div whileTap={{ scale: 0.98 }}>
          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
          >
            <MoonStar className="w-5 h-5" />
            Goodnight
          </Button>
        </motion.div>

        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <Library className="w-4 h-4 mr-2" />
          Back to Library
        </Button>
      </motion.div>
    </motion.div>
  );
}
