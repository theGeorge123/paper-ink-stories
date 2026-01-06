import { motion } from "framer-motion";
import { Book, Brain, Sparkles, Moon, ChevronRight, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState } from "react";
import { Language } from "@/lib/i18n";

const FloatingBook = ({ delay = 0, className = "" }: { delay?: number; className?: string }) => (
  <motion.div
    className={`absolute opacity-20 ${className}`}
    animate={{
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
    }}
    transition={{
      duration: 6,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <Book className="w-12 h-12 text-primary" />
  </motion.div>
);

const ValueProp = ({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay }}
    className="flex flex-col items-center text-center p-8 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50"
  >
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
      <Icon className="w-8 h-8 text-primary" />
    </div>
    <h3 className="font-serif text-xl font-bold text-foreground mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Landing page is always shown - no auto-redirect to dashboard

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background paper-texture">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Book className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="min-h-screen bg-background paper-texture overflow-hidden">
      {/* Floating decorations */}
      <FloatingBook delay={0} className="top-20 left-[10%]" />
      <FloatingBook delay={1} className="top-40 right-[15%]" />
      <FloatingBook delay={2} className="bottom-40 left-[20%]" />
      <FloatingBook delay={3} className="bottom-20 right-[10%]" />

      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang.flag}</span>
            <span className="hidden sm:inline">{currentLang.name}</span>
          </Button>
          
          {showLangMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]"
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors ${
                    language === lang.code ? 'bg-primary/10 text-primary' : 'text-foreground'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-8 px-4 py-2 rounded-full bg-muted/50 border border-border/50"
          >
            <Book className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-foreground">{t('appName')}</span>
          </motion.div>

          <h1 className="font-serif text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
            {t('heroTitle')}{" "}
            <span className="text-primary">{t('heroTitleHighlight')}</span>{" "}
            {t('heroTitleEnd')}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => navigate("/demo")}
              variant="outline"
              className="px-8 py-6 text-lg font-medium rounded-xl border-primary/50 hover:bg-primary/10"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {t('tryDemo')}
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="px-8 py-6 text-lg font-medium rounded-xl shadow-elevated"
            >
              {t('startFree')}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No account needed to try the demo
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          >
            <motion.div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* Value Props Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('whyParentsLove')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('whyParentsLoveSubtitle')}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <ValueProp
              icon={Moon}
              title={t('sleepEngineered')}
              description={t('sleepEngineeredDesc')}
              delay={0.1}
            />
            <ValueProp
              icon={Brain}
              title={t('infiniteMemory')}
              description={t('infiniteMemoryDesc')}
              delay={0.2}
            />
            <ValueProp
              icon={Sparkles}
              title={t('stealthEducation')}
              description={t('stealthEducationDesc')}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border/50"
        >
          <Book className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('readyForDreams')}
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            {t('readyForDreamsSubtitle')}
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="px-10 py-6 text-lg font-medium rounded-xl shadow-elevated"
          >
            {t('beginStory')}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4 text-primary" />
            <span className="font-serif font-bold">{t('appName')}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/about")} className="hover:text-foreground transition-colors">
              About
            </button>
            <button onClick={() => navigate("/support")} className="hover:text-foreground transition-colors">
              Support
            </button>
          </div>
          <p>© {new Date().getFullYear()} {t('appName')}. {t('madeWithLove')}</p>
        </div>
      </footer>
    </div>
  );
}