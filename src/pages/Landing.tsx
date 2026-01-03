import { motion } from "framer-motion";
import { Book, Moon, Heart, Sparkles, ChevronRight, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useState } from "react";
import { Language } from "@/lib/i18n";

const FloatingBook = ({ delay = 0, className = "" }: { delay?: number; className?: string }) => (
  <motion.div
    className={`absolute opacity-10 pointer-events-none ${className}`}
    animate={{
      y: [0, -15, 0],
      rotate: [0, 3, -3, 0],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  >
    <Book className="w-10 h-10 text-primary" />
  </motion.div>
);

const StepCard = ({
  icon: Icon,
  title,
  description,
  step,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  step: number;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40"
  >
    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center mb-3 text-primary font-semibold text-sm">
      {step}
    </div>
    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
      <Icon className="w-7 h-7 text-primary" />
    </div>
    <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
  </motion.div>
);

const LANGUAGES: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background paper-texture">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Book className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="min-h-screen bg-background paper-texture overflow-hidden">
      {/* Floating decorations - subtle */}
      <FloatingBook delay={0} className="top-24 left-[8%] hidden sm:block" />
      <FloatingBook delay={2} className="top-48 right-[12%] hidden sm:block" />
      <FloatingBook delay={4} className="bottom-32 left-[15%] hidden sm:block" />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-2 bg-card/70 backdrop-blur-sm border border-border/40 hover:bg-card"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang.flag}</span>
            <span className="hidden sm:inline text-sm">{currentLang.name}</span>
          </Button>
          
          {showLangMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden min-w-[150px]"
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLangMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors ${
                    language === lang.code ? 'bg-primary/10 text-primary' : 'text-foreground'
                  }`}
                >
                  <span>{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-5 sm:px-8 py-16">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-2xl mx-auto text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 rounded-full bg-muted/50 border border-border/40"
          >
            <Book className="w-4 h-4 text-primary" />
            <span className="font-serif font-semibold text-sm text-foreground">{t('appName')}</span>
          </motion.div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-5">
            {t('heroTitle')}{" "}
            <span className="text-primary">{t('heroTitleHighlight')}</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed px-2">
            {t('heroSubtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-6 py-5 text-base font-medium rounded-xl shadow-lg"
            >
              {t('startFree')}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-6 py-5 text-base font-medium rounded-xl"
            >
              {t('login')}
            </Button>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 rounded-full border-2 border-muted-foreground/25 flex items-start justify-center p-1.5"
          >
            <motion.div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* How it works Section */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {t('whyParentsLove')}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              {t('whyParentsLoveSubtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            <StepCard
              icon={Heart}
              title={t('sleepEngineered')}
              description={t('sleepEngineeredDesc')}
              step={1}
              delay={0.1}
            />
            <StepCard
              icon={Moon}
              title={t('infiniteMemory')}
              description={t('infiniteMemoryDesc')}
              step={2}
              delay={0.2}
            />
            <StepCard
              icon={Sparkles}
              title={t('stealthEducation')}
              description={t('stealthEducationDesc')}
              step={3}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-20 px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center p-8 sm:p-10 rounded-2xl bg-gradient-to-br from-primary/8 via-card to-secondary/8 border border-border/40"
        >
          <Moon className="w-12 h-12 text-primary mx-auto mb-5" />
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-3">
            {t('readyForDreams')}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-md mx-auto">
            {t('readyForDreamsSubtitle')}
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="px-8 py-5 text-base font-medium rounded-xl shadow-lg"
          >
            {t('beginStory')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-5 border-t border-border/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Book className="w-3.5 h-3.5 text-primary" />
            <span className="font-serif font-semibold">{t('appName')}</span>
          </div>
          <p className="text-center sm:text-right">{t('madeWithLove')}</p>
        </div>
      </footer>
    </div>
  );
}
