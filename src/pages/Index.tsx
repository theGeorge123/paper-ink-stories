import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CharacterCarousel from '@/components/CharacterCarousel';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useLanguage } from '@/hooks/useLanguage';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      const protectedRoutes = ['/dashboard', '/create', '/read'];
      const isProtected = protectedRoutes.some((route) => location.pathname.startsWith(route));
      if (isProtected) {
        navigate('/auth');
      }
    }
  }, [user, loading, navigate, location.pathname]);

  const { data: characters, isLoading } = useQuery({
    queryKey: ['characters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*, stories(id, is_active, last_summary)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleCharacterUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['characters', user?.id] });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background paper-texture flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
          />
          <span className="text-muted-foreground font-serif">Loading your library...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <header className="px-6 py-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <BookOpen className="w-7 h-7 text-primary" />
            <h1 className="font-serif text-2xl text-foreground">Paper & Ink</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => supabase.auth.signOut()}
              className="text-muted-foreground"
            >
              Sign Out
            </Button>
          </motion.div>
        </div>
      </header>

      <main id="main-content" className="px-6 pb-24 max-w-2xl mx-auto">
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-serif text-xl text-foreground">Your Characters</h2>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate('/create')} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              New Hero
            </Button>
          </motion.div>
        </motion.div>

        {characters && characters.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="py-4"
          >
            <ErrorBoundary fallbackMessage="We couldn’t load your characters.">
              <CharacterCarousel 
                characters={characters} 
                onCharacterUpdated={handleCharacterUpdated}
              />
            </ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16"
          >
            <motion.div
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-6"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-12 h-12 text-primary" />
            </motion.div>
            <h3 className="font-serif text-2xl text-foreground mb-3">{t('noCharactersYet')}</h3>
            <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
              {t('noCharactersDesc')}
            </p>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button onClick={() => navigate('/create')} size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                {t('createFirstHero')}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
