import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CharacterCard from '@/components/CharacterCard';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const { data: characters, isLoading } = useQuery({
    queryKey: ['characters', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*, stories(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background paper-texture flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      <header className="px-6 py-8">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-primary" />
            <h1 className="font-serif text-2xl text-foreground">Paper & Ink</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => supabase.auth.signOut()}
            className="text-muted-foreground"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="px-6 pb-24 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-foreground">Your Characters</h2>
          <Button onClick={() => navigate('/create')} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Hero
          </Button>
        </div>

        {characters && characters.length > 0 ? (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="space-y-4"
          >
            {characters.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
              <Sparkles className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-xl text-foreground mb-2">No characters yet</h3>
            <p className="text-muted-foreground mb-6">Create your first hero to begin the adventure</p>
            <Button onClick={() => navigate('/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Character
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
