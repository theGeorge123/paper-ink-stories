import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

interface StoryErrorStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
  errorMessage?: string;
}

export default function StoryErrorState({ onRetry, isRetrying = false, errorMessage }: StoryErrorStateProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const messages = {
    en: {
      title: 'Story Magic Paused',
      subtitle: errorMessage || 'The story magic is taking a short rest. Let\'s try again!',
      retry: 'Try Again',
      retrying: 'Trying...',
      goHome: 'Go Home',
    },
    nl: {
      title: 'Verhaalmagie Pauzeert',
      subtitle: errorMessage || 'De verhaalmagie rust even. Laten we het opnieuw proberen!',
      retry: 'Opnieuw proberen',
      retrying: 'Bezig...',
      goHome: 'Naar Home',
    },
    sv: {
      title: 'Sagomagin Pausar',
      subtitle: errorMessage || 'Sagomagin vilar en stund. Låt oss försöka igen!',
      retry: 'Försök igen',
      retrying: 'Försöker...',
      goHome: 'Gå Hem',
    },
  };

  const t = messages[language] || messages.en;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6"
      >
        <AlertCircle className="w-10 h-10 text-amber-500" />
      </motion.div>

      <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
        {t.title}
      </h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        {t.subtitle}
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          className="gap-2"
          size="lg"
        >
          <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? t.retrying : t.retry}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="gap-2"
          size="lg"
        >
          <Home className="w-5 h-5" />
          {t.goHome}
        </Button>
      </div>
    </motion.div>
  );
}
