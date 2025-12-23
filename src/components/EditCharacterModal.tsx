import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Wand2, Cat, Bot, Crown, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ARCHETYPES = [
  { id: 'knight', icon: Shield, label: 'Knight' },
  { id: 'wizard', icon: Wand2, label: 'Wizard' },
  { id: 'cat', icon: Cat, label: 'Cat' },
  { id: 'robot', icon: Bot, label: 'Robot' },
  { id: 'princess', icon: Crown, label: 'Princess' },
  { id: 'dragon', icon: Flame, label: 'Dragon' },
];

interface Character {
  id: string;
  name: string;
  archetype: string;
  traits: string[];
  sidekick_name: string | null;
  sidekick_archetype: string | null;
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
  const [sidekickName, setSidekickName] = useState(character.sidekick_name || '');
  const [saving, setSaving] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-center">
            Edit Character
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
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
            <div className="grid grid-cols-3 gap-2">
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
          <div className="flex gap-3 pt-2">
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
