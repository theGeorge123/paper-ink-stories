import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, Wand2, Cat, Bot, Crown, Flame, Rocket, Anchor, Sparkles, Bird, Rabbit, Heart, Moon, Sun, TreePine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/lib/i18n';
import { getOrCreateDemoId, saveDemoHero } from '@/lib/demoStorage';
import { toast } from 'sonner';

const ARCHETYPES = [
  { id: 'knight', icon: Shield, label: 'Knight', color: 'from-blue-400/20 to-blue-600/20', glow: 'shadow-blue-500/30' },
  { id: 'wizard', icon: Wand2, label: 'Wizard', color: 'from-purple-400/20 to-purple-600/20', glow: 'shadow-purple-500/30' },
  { id: 'cat', icon: Cat, label: 'Cat', color: 'from-orange-400/20 to-orange-600/20', glow: 'shadow-orange-500/30' },
  { id: 'robot', icon: Bot, label: 'Robot', color: 'from-slate-400/20 to-slate-600/20', glow: 'shadow-slate-500/30' },
  { id: 'princess', icon: Crown, label: 'Princess', color: 'from-pink-400/20 to-pink-600/20', glow: 'shadow-pink-500/30' },
  { id: 'dragon', icon: Flame, label: 'Dragon', color: 'from-red-400/20 to-red-600/20', glow: 'shadow-red-500/30' },
  { id: 'astronaut', icon: Rocket, label: 'Astronaut', color: 'from-cyan-400/20 to-cyan-600/20', glow: 'shadow-cyan-500/30' },
  { id: 'pirate', icon: Anchor, label: 'Pirate', color: 'from-amber-400/20 to-amber-600/20', glow: 'shadow-amber-500/30' },
  { id: 'fairy', icon: Sparkles, label: 'Fairy', color: 'from-fuchsia-400/20 to-fuchsia-600/20', glow: 'shadow-fuchsia-500/30' },
  { id: 'owl', icon: Bird, label: 'Owl', color: 'from-emerald-400/20 to-emerald-600/20', glow: 'shadow-emerald-500/30' },
  { id: 'bunny', icon: Rabbit, label: 'Bunny', color: 'from-rose-400/20 to-rose-600/20', glow: 'shadow-rose-500/30' },
  { id: 'bear', icon: Heart, label: 'Bear', color: 'from-yellow-400/20 to-yellow-600/20', glow: 'shadow-yellow-500/30' },
];

const TRAITS = ['Brave', 'Curious', 'Funny', 'Kind', 'Clever', 'Creative', 'Adventurous', 'Gentle'];

type AgeBandOption = {
  id: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: LucideIcon;
  theme: string;
};

const AGE_BANDS: AgeBandOption[] = [
  { id: '1-2', labelKey: 'ageBand12', descKey: 'ageBand12Desc', icon: Moon, theme: 'from-sky-400/20 to-indigo-400/20' },
  { id: '3-5', labelKey: 'ageBand35', descKey: 'ageBand35Desc', icon: Heart, theme: 'from-indigo-400/20 to-purple-400/20' },
  { id: '6-8', labelKey: 'ageBand68', descKey: 'ageBand68Desc', icon: Sun, theme: 'from-amber-400/20 to-orange-400/20' },
  { id: '9-12', labelKey: 'ageBand912', descKey: 'ageBand912Desc', icon: TreePine, theme: 'from-emerald-400/20 to-teal-400/20' },
];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
  }),
};

export default function DemoHero() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState('');
  const [ageBand, setAgeBand] = useState('3-5');
  const [traits, setTraits] = useState<string[]>([]);
  const [sidekickName, setSidekickName] = useState('');
  const [sidekickArchetype, setSidekickArchetype] = useState('');
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const toggleTrait = (trait: string) => {
    if (traits.includes(trait)) {
      setTraits(traits.filter((t) => t !== trait));
    } else if (traits.length < 3) {
      setTraits([...traits, trait]);
    }
  };

  const handleStartDemo = async () => {
    const demoId = getOrCreateDemoId();
    if (!demoId) return;

    setSaving(true);
    try {
      await saveDemoHero(demoId, {
        heroName: name.trim(),
        heroType: selectedArchetype?.label ?? archetype,
        heroTrait: traits[0] ?? 'Kind',
        comfortItem: 'blanket',
        ageBand,
        sidekickName: sidekickName.trim() || null,
        sidekickArchetype: sidekickArchetype || null,
      });
      navigate('/demo-questions');
    } catch (error) {
      console.error('Failed to start demo', error);
      toast.error('Unable to start the demo right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  const canProceed = step === 1 ? name.trim().length > 0 : step === 2 ? archetype && ageBand : step === 3 ? traits.length > 0 : true;

  const selectedArchetype = ARCHETYPES.find(a => a.id === archetype);

  return (
    <div className="min-h-screen bg-background paper-texture overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => (step > 1 ? goToStep(step - 1) : navigate('/'))}
          className="gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('back')}
        </Button>
        
        {/* Demo badge + Step indicator */}
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-primary">{t('demoStoryLabel')}</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <motion.div 
                key={s} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-primary' : s < step ? 'w-2 bg-primary/60' : 'w-2 bg-muted'
                }`}
                layoutId={`step-${s}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="px-6 pb-32 max-w-lg mx-auto">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 1: Hero Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <div className="text-center pt-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6"
                >
                  <Sparkles className="w-10 h-10 text-primary" />
                </motion.div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {t('step1Title')}
                </h1>
                <p className="text-muted-foreground">
                  {t('step1Subtitle')}
                </p>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Input
                  placeholder={t('heroNamePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-16 text-xl text-center font-serif bg-card/50 border-2 border-border/50 focus:border-primary rounded-2xl"
                  autoFocus
                />
              </motion.div>

              {name && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-muted-foreground italic"
                >
                  "{name}" sounds like a hero ready for adventure!
                </motion.p>
              )}
            </motion.div>
          )}

          {/* Step 2: Archetype & Age */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <div className="text-center pt-4">
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {t('step2Title')}
                </h1>
                <p className="text-muted-foreground">
                  {t('step2Subtitle')}
                </p>
              </div>

              {/* Bento Grid Archetypes */}
              <div className="grid grid-cols-4 gap-3">
                {ARCHETYPES.map((a, index) => {
                  const isSelected = archetype === a.id;
                  return (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setArchetype(a.id)}
                      className={`relative aspect-square rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                        isSelected 
                          ? `border-primary bg-gradient-to-br ${a.color} shadow-lg ${a.glow}` 
                          : 'border-border/50 bg-card/50 hover:border-border'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="archetype-glow"
                          className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent"
                        />
                      )}
                      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1 p-2">
                        <motion.div
                          animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <a.icon className={`w-7 h-7 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        </motion.div>
                        <span className={`text-[10px] font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {a.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Age Band Selection */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">{t('selectAgeBand')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {AGE_BANDS.map((age, index) => {
                    const isSelected = ageBand === age.id;
                    const Icon = age.icon;
                    const label = t(age.labelKey);
                    const desc = t(age.descKey);
                    return (
                      <motion.button
                        key={age.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setAgeBand(age.id)}
                        className={`relative p-4 rounded-2xl border-2 transition-all duration-300 ${
                          isSelected
                            ? `border-primary bg-gradient-to-br ${age.theme} shadow-lg`
                            : 'border-border/50 bg-card/30 hover:border-border'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Icon className={`w-8 h-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                          </span>
                          <span className="text-[10px] text-muted-foreground text-center leading-tight">
                            {desc}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Traits */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <div className="text-center pt-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6"
                >
                  {selectedArchetype && <selectedArchetype.icon className="w-10 h-10 text-primary" />}
                </motion.div>
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {name}'s Spirit
                </h1>
                <p className="text-muted-foreground">
                  {t('selectTraits')} (up to 3)
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {TRAITS.map((trait, index) => {
                  const isSelected = traits.includes(trait);
                  return (
                    <motion.button
                      key={trait}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleTrait(trait)}
                      disabled={!isSelected && traits.length >= 3}
                      className={`px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : traits.length >= 3
                          ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {trait}
                    </motion.button>
                  );
                })}
              </div>

              {traits.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p className="text-muted-foreground">
                    {name} is <span className="text-primary font-medium">{traits.join(', ').replace(/, ([^,]*)$/, ' & $1')}</span>
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 4: Companion & Start Demo */}
          {step === 4 && (
            <motion.div
              key="step4"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <div className="text-center pt-4">
                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {t('step3Title')}
                </h1>
                <p className="text-muted-foreground">
                  {t('step3Subtitle')}
                </p>
              </div>

              <Input
                placeholder={t('sidekickNamePlaceholder')}
                value={sidekickName}
                onChange={(e) => setSidekickName(e.target.value)}
                className="h-14 text-lg text-center bg-card/50 border-2 border-border/50 focus:border-primary rounded-2xl"
              />

              {sidekickName && (
                <div className="grid grid-cols-4 gap-3">
                  {ARCHETYPES.slice(0, 8).map((a) => {
                    const isSelected = sidekickArchetype === a.id;
                    return (
                      <motion.button
                        key={a.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSidekickArchetype(a.id)}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-card/30 hover:border-border'
                        }`}
                      >
                        <a.icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-[9px] font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {a.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleStartDemo}
                  size="lg"
                  className="w-full h-14 text-lg rounded-2xl shadow-lg shadow-primary/30"
                  disabled={saving}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {saving ? 'Starting demo...' : 'Start Demo Story'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  This is a demo preview. Sign up to save your hero and unlock personalized stories!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed bottom continue button */}
      {step < 4 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent"
        >
          <Button
            onClick={() => goToStep(step + 1)}
            disabled={!canProceed}
            size="lg"
            className="w-full max-w-lg mx-auto h-14 text-lg rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center"
          >
            {t('continue')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
