import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Wand2, Cat, Bot, Crown, Flame, RefreshCw, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSignedImageUrl } from '@/hooks/useSignedImageUrl';

const ARCHETYPES = [
  { id: 'knight', icon: Shield, label: 'Knight' },
  { id: 'wizard', icon: Wand2, label: 'Wizard' },
  { id: 'cat', icon: Cat, label: 'Cat' },
  { id: 'robot', icon: Bot, label: 'Robot' },
  { id: 'princess', icon: Crown, label: 'Princess' },
  { id: 'dragon', icon: Flame, label: 'Dragon' },
];

const AGE_BANDS = [
  { id: '3-5', label: '3-5', emoji: '🧸' },
  { id: '6-8', label: '6-8', emoji: '📚' },
  { id: '9-12', label: '9-12', emoji: '🌟' },
];

interface Character {
  id: string;
  name: string;
  archetype: string;
  traits: string[];
  sidekick_name: string | null;
  sidekick_archetype: string | null;
  age_band?: string;
  hero_image_url?: string | null;
}

interface EditCharacterModalProps {
  character: Character;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function EditCharacterModal({ 
  character, 
  open, 
  onOpenChange, 
  onSaved 
}: EditCharacterModalProps) {
  const [name, setName] = useState(character.name);
  const [archetype, setArchetype] = useState(character.archetype);
  const [ageBand, setAgeBand] = useState(character.age_band || '6-8');
  const [sidekickName, setSidekickName] = useState(character.sidekick_name || '');
  const [saving, setSaving] = useState(false);
  const [regeneratingPortrait, setRegeneratingPortrait] = useState(false);
  const { url: signedPortrait, error: portraitError, refresh, handleError, loading } = useSignedImageUrl({
    initialUrl: character.hero_image_url,
    heroId: character.id,
  });

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setSaving(true);
    
    const { error } = await supabase
      .from('characters')
      .update({
        name: name.trim(),
        archetype,
        age_band: ageBand,
        sidekick_name: sidekickName.trim() || null,
      })
      .eq('id', character.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      console.error('Update error:', error);
    } else {
      toast.success('Character updated!');
      onOpenChange(false);
      onSaved?.();
    }
  };

  const handleRegeneratePortrait = async () => {
    setRegeneratingPortrait(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-hero-portrait', {
        body: { characterId: character.id, regenerate: true },
      });

      if (error) {
        console.error('Portrait regeneration error:', error);
        toast.error('Failed to regenerate portrait');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Portrait regenerated! It may take a moment to appear.');
      onSaved?.();
    } catch (err) {
      console.error('Portrait regeneration exception:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setRegeneratingPortrait(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-center">
            Edit Character
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pb-4">
          {/* Portrait Preview & Regenerate */}
          <div className="flex flex-col items-center gap-3">
            {signedPortrait && !portraitError ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                <img
                  src={signedPortrait}
                  alt={character.name}
                  className="w-full h-full object-cover"
                  onError={handleError}
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegeneratePortrait}
              disabled={regeneratingPortrait}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${regeneratingPortrait ? 'animate-spin' : ''}`} />
              {regeneratingPortrait ? 'Generating...' : 'Regenerate Portrait'}
            </Button>
            {portraitError && (
              <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
                {loading ? 'Refreshing...' : 'Retry loading portrait'}
              </Button>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Hero Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              className="bg-background/50"
            />
          </div>

          {/* Archetype */}
          <div className="space-y-2">
            <Label>Archetype</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ARCHETYPES.map((arch) => {
                const Icon = arch.icon;
                const isSelected = archetype === arch.id;
                return (
                  <motion.button
                    key={arch.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setArchetype(arch.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 bg-background/50 hover:border-border'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs ${isSelected ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {arch.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Age Band */}
          <div className="space-y-2">
            <Label>Child's Age</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AGE_BANDS.map((age) => {
                const isSelected = ageBand === age.id;
                return (
                  <motion.button
                    key={age.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAgeBand(age.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border/50 bg-background/50 hover:border-border'
                    }`}
                  >
                    <span className="text-lg">{age.emoji}</span>
                    <span className={`text-xs ${isSelected ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                      {age.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Sidekick */}
          <div className="space-y-2">
            <Label htmlFor="sidekick">Sidekick Name (optional)</Label>
            <Input
              id="sidekick"
              value={sidekickName}
              onChange={(e) => setSidekickName(e.target.value)}
              placeholder="e.g., Whiskers, Sparky..."
              className="bg-background/50"
            />
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 left-0 right-0 flex gap-3 pt-3 pb-1 bg-gradient-to-t from-background via-background/95 to-background/70">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
