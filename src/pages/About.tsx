import { motion } from "framer-motion";
import { Book, Heart, Moon, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background paper-texture">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-foreground">{t('appName')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8">
            {t('aboutTitle')}
          </h1>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">{t('aboutMission')}</h2>
              </div>
              <p>{t('aboutMissionText')}</p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">{t('aboutSleepEngineered')}</h2>
              </div>
              <p>{t('aboutSleepEngineeredText')}</p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">{t('aboutInfiniteAdventures')}</h2>
              </div>
              <p>{t('aboutInfiniteAdventuresText')}</p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-foreground">{t('aboutForParents')}</h2>
              <p>{t('aboutForParentsText')}</p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              {t('aboutContact')}{" "}
              <Link to="/support" className="text-primary hover:underline">
                {t('aboutContactLink')}
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {t('appName')}. {t('madeWithLove')}</p>
        </div>
      </footer>
    </div>
  );
}
