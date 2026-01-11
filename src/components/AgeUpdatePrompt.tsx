import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface AgeUpdatePromptProps {
  characterId: string;
  characterName: string;
  currentAgeBand: string;
  suggestedAgeBand: string;
  reason: 'time' | 'stories';
  monthsSinceCreation?: number;
  storyCount?: number;
  onDismiss: () => void;
  onUpdated?: () => void;
}

const AGE_BAND_INFO: Record<string, { label: string; description: string; changes: string[] }> = {
  '3-5': {
    label: 'Ages 3-5',
    description: 'Toddlers & Preschoolers',
    changes: [
      'Slightly longer sentences',
      'More descriptive words',
      'Gentle adventure themes',
      'Focus on routine and repetition',
    ],
  },
  '6-8': {
    label: 'Ages 6-8',
    description: 'Young Explorers',
    changes: [
      'More complex sentences',
      'Introduction of new vocabulary',
      'Gentle magic and wonder',
      'Character development',
    ],
  },
  '9-12': {
    label: 'Ages 9-12',
    description: 'Growing Dreamers',
    changes: [
      'Richer vocabulary',
      'Adventurous storylines',
      'Moral themes and choices',
      'More detailed descriptions',
    ],
  },
};

export default function AgeUpdatePrompt({
  characterId,
  characterName,
  currentAgeBand,
  suggestedAgeBand,
  reason,
  monthsSinceCreation,
  storyCount,
  onDismiss,
  onUpdated,
}: AgeUpdatePromptProps) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const currentInfo = AGE_BAND_INFO[currentAgeBand] || { label: currentAgeBand, description: '', changes: [] };
  const suggestedInfo = AGE_BAND_INFO[suggestedAgeBand] || { label: suggestedAgeBand, description: '', changes: [] };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('characters')
        .update({ age_band: suggestedAgeBand })
        .eq('id', characterId);

      if (error) {
        throw error;
      }

      toast.success(
        language === 'nl'
          ? `${characterName}'s leeftijdsgroep is bijgewerkt!`
          : language === 'sv'
          ? `${characterName}s åldersgrupp har uppdaterats!`
          : `${characterName}'s age band has been updated!`
      );

      queryClient.invalidateQueries({ queryKey: ['characters'] });
      queryClient.invalidateQueries({ queryKey: ['age-update-check', characterId] });
      onUpdated?.();
      setDismissed(true);
    } catch (error) {
      console.error('Failed to update age band:', error);
      toast.error(
        language === 'nl'
          ? 'Kon leeftijdsgroep niet bijwerken'
          : language === 'sv'
          ? 'Kunde inte uppdatera åldersgrupp'
          : 'Failed to update age band'
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  if (dismissed) return null;

  return (
    <Dialog open={!dismissed} onOpenChange={handleDismiss}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="font-serif text-2xl text-center">
            {language === 'nl'
              ? `Is ${characterName} klaar voor meer geavanceerde verhalen?`
              : language === 'sv'
              ? `Är ${characterName} redo för mer avancerade berättelser?`
              : `Is ${characterName} ready for more advanced stories?`}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {reason === 'time' && monthsSinceCreation
              ? language === 'nl'
                ? `Het is ${monthsSinceCreation} maanden geleden sinds ${characterName} is aangemaakt.`
                : language === 'sv'
                ? `Det har gått ${monthsSinceCreation} månader sedan ${characterName} skapades.`
                : `It's been ${monthsSinceCreation} months since ${characterName} was created.`
              : reason === 'stories' && storyCount
              ? language === 'nl'
                ? `${characterName} heeft ${storyCount} verhalen gelezen!`
                : language === 'sv'
                ? `${characterName} har läst ${storyCount} berättelser!`
                : `${characterName} has read ${storyCount} stories!`
              : language === 'nl'
              ? 'Misschien is het tijd voor een nieuwe leeftijdsgroep.'
              : language === 'sv'
              ? 'Kanske är det dags för en ny åldersgrupp.'
              : 'Maybe it\'s time for a new age band.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Current vs Suggested */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {language === 'nl' ? 'Huidig' : language === 'sv' ? 'Nuvarande' : 'Current'}
                </span>
              </div>
              <h4 className="font-serif font-semibold text-sm">{currentInfo.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{currentInfo.description}</p>
            </div>
            <div className="p-4 rounded-xl border-2 border-primary/50 bg-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {language === 'nl' ? 'Voorgesteld' : language === 'sv' ? 'Föreslagen' : 'Suggested'}
                </span>
              </div>
              <h4 className="font-serif font-semibold text-sm">{suggestedInfo.label}</h4>
              <p className="text-xs text-muted-foreground mt-1">{suggestedInfo.description}</p>
            </div>
          </div>

          {/* Changes Preview */}
          <div className="p-4 rounded-xl border border-border/50 bg-card/50">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">
                {language === 'nl' ? 'Wat verandert er?' : language === 'sv' ? 'Vad ändras?' : 'What changes?'}
              </h4>
            </div>
            <ul className="space-y-2">
              {suggestedInfo.changes.map((change, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="flex-1"
              disabled={updating}
            >
              {language === 'nl' ? 'Nog niet' : language === 'sv' ? 'Inte än' : 'Not yet'}
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updating}
              className="flex-1 gap-2"
            >
              {updating
                ? language === 'nl'
                  ? 'Bijwerken...'
                  : language === 'sv'
                  ? 'Uppdaterar...'
                  : 'Updating...'
                : language === 'nl'
                ? 'Bijwerken'
                : language === 'sv'
                ? 'Uppdatera'
                : 'Update'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
