import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Shield, Wand2, Cat, Bot, Crown, Flame, Rocket, Anchor, Sparkles, Bird, Rabbit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const ARCHETYPES = [
  { id: 'knight', icon: Shield, label: 'Knight' },
  { id: 'wizard', icon: Wand2, label: 'Wizard' },
  { id: 'cat', icon: Cat, label: 'Cat' },
  { id: 'robot', icon: Bot, label: 'Robot' },
  { id: 'princess', icon: Crown, label: 'Princess' },
  { id: 'dragon', icon: Flame, label: 'Dragon' },
  { id: 'astronaut', icon: Rocket, label: 'Astronaut' },
  { id: 'pirate', icon: Anchor, label: 'Pirate' },
  { id: 'fairy', icon: Sparkles, label: 'Fairy' },
  { id: 'owl', icon: Bird, label: 'Owl' },
  { id: 'bunny', icon: Rabbit, label: 'Bunny' },
];

const TRAITS = ['Brave', 'Curious', 'Funny', 'Kind', 'Clever', 'Creative', 'Adventurous', 'Gentle'];

export default function CreateCharacter() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [archetype, setArchetype] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [sidekickName, setSidekickName] = useState('');
  const [sidekickArchetype, setSidekickArchetype] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleTrait = (trait: string) => {
    if (traits.includes(trait)) {
      setTraits(traits.filter((t) => t !== trait));
    } else if (traits.length < 3) {
      setTraits([...traits, trait]);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('characters').insert({
      user_id: user.id,
      name,
      archetype,
      traits,
      icon: archetype,
      sidekick_name: sidekickName || null,
      sidekick_archetype: sidekickArchetype || null,
    });

    setLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      navigate('/');
    }
  };

  const canProceed = step === 1 ? name && archetype : step === 2 ? traits.length > 0 : true;

  return (
    <div className="min-h-screen bg-background paper-texture">
      <header className="px-6 py-4">
        <Button variant="ghost" onClick={() => (step > 1 ? setStep(step - 1) : navigate('/'))}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
      </header>

      <main className="px-6 pb-24 max-w-lg mx-auto">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl text-foreground mb-2">Name Your Hero</h2>
              <p className="text-muted-foreground mb-6">Every great story begins with a name</p>

              <Input
                placeholder="Enter a heroic name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mb-6 h-12 text-lg"
              />

              <div className="grid grid-cols-4 gap-3">
                {ARCHETYPES.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setArchetype(a.id)}
                    className={`archetype-btn ${archetype === a.id ? 'selected' : ''}`}
                  >
                    <a.icon className="w-6 h-6 mb-1" />
                    <span className="text-xs">{a.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl text-foreground mb-2">Choose Their Spirit</h2>
              <p className="text-muted-foreground mb-6">Select up to 3 traits</p>

              <div className="flex flex-wrap gap-3">
                {TRAITS.map((trait) => (
                  <button
                    key={trait}
                    onClick={() => toggleTrait(trait)}
                    className={`trait-chip ${traits.includes(trait) ? 'selected' : ''}`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="font-serif text-2xl text-foreground mb-2">Add a Companion</h2>
              <p className="text-muted-foreground mb-6">Every hero needs a friend (optional)</p>

              <Input
                placeholder="Companion name..."
                value={sidekickName}
                onChange={(e) => setSidekickName(e.target.value)}
                className="mb-4 h-12"
              />

              <div className="grid grid-cols-4 gap-3 mb-6">
                {ARCHETYPES.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSidekickArchetype(a.id)}
                    className={`archetype-btn ${sidekickArchetype === a.id ? 'selected' : ''}`}
                  >
                    <a.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>

              <Button onClick={handleCreate} disabled={loading} className="w-full h-12">
                {loading ? 'Creating...' : 'Create Character'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 3 && (
          <Button onClick={() => setStep(step + 1)} disabled={!canProceed} className="w-full mt-8 h-12">
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </main>
    </div>
  );
}
