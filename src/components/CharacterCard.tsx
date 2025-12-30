import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Sparkles, Shield, Wand2, Cat, Bot, Crown, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

const ARCHETYPE_ICONS: Record<string, React.ElementType> = {
  knight: Shield,
  wizard: Wand2,
  cat: Cat,
  robot: Bot,
  princess: Crown,
  dragon: Flame,
};

interface CharacterCardProps {
  character: {
    id: string;
    name: string;
    archetype: string;
    traits: string[];
    sidekick_name: string | null;
    stories?: { id: string; is_active: boolean }[];
  };
}

export default function CharacterCard({ character }: CharacterCardProps) {
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const Icon = ARCHETYPE_ICONS[character.archetype] || Sparkles;
  const activeStory = character.stories?.find((s) => s.is_active);

  const startNewStory = async (length: 'SHORT' | 'MEDIUM' | 'LONG') => {
    setLoading(true);
    
    // Deactivate old stories
    await supabase
      .from('stories')
      .update({ is_active: false })
      .eq('character_id', character.id);

    // Create new story
    const { data: newStory, error } = await supabase
      .from('stories')
      .insert({
        character_id: character.id,
        length_setting: length,
        is_active: true,
      })
      .select()
      .single();

    setLoading(false);
    setShowLengthModal(false);

    if (!error && newStory) {
      navigate(`/read/${newStory.id}`);
    }
  };

  return (
    <>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        className="character-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-xl text-foreground mb-1">{character.name}</h3>
            <p className="text-sm text-muted-foreground capitalize mb-3">
              {character.archetype}
              {character.sidekick_name && ` & ${character.sidekick_name}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {character.traits.map((trait) => (
                <span key={trait} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          {activeStory && (
            <Button
              onClick={() => navigate(`/read/${activeStory.id}`)}
              className="flex-1 gap-2"
            >
              <Play className="w-4 h-4" />
              Continue
            </Button>
          )}
          <Button
            onClick={() => setShowLengthModal(true)}
            variant={activeStory ? 'outline' : 'default'}
            className="flex-1 gap-2"
          >
            <Sparkles className="w-4 h-4" />
            New Adventure
          </Button>
        </div>
      </motion.div>

      <Dialog open={showLengthModal} onOpenChange={setShowLengthModal}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-center">
              How long is tonight's story?
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Choose a story length for {character.name}'s adventure
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { key: 'SHORT', emoji: '🧸', label: 'Short', desc: '~5 minutes' },
              { key: 'MEDIUM', emoji: '📖', label: 'Medium', desc: '~10 minutes' },
              { key: 'LONG', emoji: '💤', label: 'Long', desc: '~15 minutes' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => startNewStory(option.key as 'SHORT' | 'MEDIUM' | 'LONG')}
                disabled={loading}
                className="length-pill hover:border-primary/50"
              >
                <span className="text-2xl">{option.emoji}</span>
                <div className="text-left">
                  <div className="font-medium text-foreground">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
