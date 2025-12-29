import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Book, Plus, LogOut, Loader2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import CharacterCarousel from "@/components/CharacterCarousel";
import SettingsMenu from "@/components/SettingsMenu";
import ParentalControls from "@/components/ParentalControls";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: characters, isLoading } = useQuery({
    queryKey: ["characters", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("characters")
        .select(`
          *,
          stories (
            id,
            is_active,
            current_page,
            last_summary,
            created_at
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10s to pick up portrait updates
  });

  const handleCharacterUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["characters"] });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background paper-texture">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background paper-texture">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Book className="w-6 h-6 text-primary" />
            <span className="font-serif font-bold text-xl text-foreground">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-2">
            <ParentalControls
              trigger={
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Shield className="w-5 h-5" />
                </Button>
              }
            />
            <SettingsMenu />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('signOut')}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10"
        >
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              {t('yourCharacters')}
            </h1>
            <p className="text-muted-foreground">
              {t('chooseHero')}
            </p>
          </div>
          <Button
            onClick={() => navigate("/create")}
            className="rounded-xl shadow-card"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('newCharacter')}
          </Button>
        </motion.div>

        {characters && characters.length > 0 ? (
          <CharacterCarousel
            characters={characters}
            onCharacterUpdated={handleCharacterUpdated}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <Book className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-3">
              {t('noCharacters')}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md">
              {t('noCharactersDesc')}
            </p>
            <Button
              onClick={() => navigate("/create")}
              size="lg"
              className="rounded-xl shadow-card"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('createFirstHero')}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}