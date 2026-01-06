import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useGuestMode } from "@/hooks/useGuestMode";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Book, Plus, LogOut, Loader2, Shield, Sparkles, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import CharacterCarousel from "@/components/CharacterCarousel";
import SettingsMenu from "@/components/SettingsMenu";
import ParentalControls from "@/components/ParentalControls";
import WelcomeModal from "@/components/WelcomeModal";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const { showAuthPrompt } = useGuestMode();
  const queryClient = useQueryClient();

  // No automatic redirect - allow guest browsing

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
    refetchInterval: 30000, // Refetch every 30s to pick up portrait updates
  });

  const handleCharacterUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["characters"] });
  };

  const handleCreateCharacter = () => {
    if (!user) {
      showAuthPrompt(t('signUpToCreate'));
    } else {
      navigate("/create");
    }
  };

  if (loading) {
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

  // Guest mode - show demo content
  const isGuest = !user;

  return (
    <div className="min-h-screen bg-background paper-texture">
      {/* Welcome modal for first-time users */}
      {!isGuest && <WelcomeModal />}
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Book className="w-6 h-6 text-primary" />
            <span className="font-serif font-bold text-xl text-foreground">{t('appName')}</span>
            {isGuest && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                {t('guestMode')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isGuest && (
              <>
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
              </>
            )}
            {isGuest && (
              <Button
                onClick={() => navigate("/auth")}
                size="sm"
                className="rounded-xl"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t('login')}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {isGuest ? (
          // Guest mode content
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                Welcome to {t('appName')}
              </h1>
              <p className="text-muted-foreground">
                Try a demo story to see how it works, or sign up to create your own characters
              </p>
            </motion.div>

            {/* Demo Story Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div className="book-cover p-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-fuchsia-100 to-fuchsia-200/50 flex items-center justify-center mb-4 shadow-lg">
                  <Sparkles className="w-10 h-10 text-fuchsia-600" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground mb-2">
                  Luna's Moonlit Garden
                </h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Luna the Fairy • with Pip the Owl
                </p>
                <div className="flex justify-center gap-2 mb-4">
                  <span className="text-xs px-3 py-1 rounded-full bg-muted/70 text-muted-foreground">
                    curious
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-muted/70 text-muted-foreground">
                    kind
                  </span>
                  <span className="text-xs px-3 py-1 rounded-full bg-muted/70 text-muted-foreground">
                    brave
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/80 mb-6">
                  A complete 4-page bedtime story demo
                </p>
                <Button
                  onClick={() => navigate("/demo")}
                  size="lg"
                  className="w-full gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {t('tryDemo')}
                </Button>
              </div>
            </motion.div>

            {/* Sign up CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mt-10"
            >
              <p className="text-muted-foreground mb-4">
                Ready to create your own personalized stories?
              </p>
              <Button
                onClick={() => navigate("/auth")}
                variant="outline"
                size="lg"
                className="rounded-xl"
              >
                {t('createFreeAccount')}
              </Button>
            </motion.div>
          </>
        ) : (
          // Authenticated user content
          <>
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
                onClick={handleCreateCharacter}
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
                  onClick={handleCreateCharacter}
                  size="lg"
                  className="rounded-xl shadow-card"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {t('createFirstHero')}
                </Button>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}