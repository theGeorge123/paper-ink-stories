import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, Mail, Moon, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface ReminderSettingsData {
  email_opt_in: boolean;
  timezone: string | null;
  bedtime_enabled: boolean;
  bedtime_time: string | null;
  story_enabled: boolean;
  story_time: string | null;
}

export default function ReminderSettings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettingsData>({
    email_opt_in: false,
    timezone: null,
    bedtime_enabled: false,
    bedtime_time: '20:00',
    story_enabled: false,
    story_time: '19:30',
  });

  // Auto-detect timezone on mount
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setSettings(prev => ({ ...prev, timezone: detectedTimezone }));
  }, []);

  // Fetch existing settings
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to fetch reminder settings:', error);
      }

      if (data) {
        setSettings({
          email_opt_in: data.email_opt_in,
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          bedtime_enabled: data.bedtime_enabled,
          bedtime_time: data.bedtime_time || '20:00',
          story_enabled: data.story_enabled,
          story_time: data.story_time || '19:30',
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('reminder_settings')
      .upsert({
        user_id: user.id,
        ...settings,
      }, {
        onConflict: 'user_id'
      });

    setSaving(false);

    if (error) {
      console.error('Failed to save reminder settings:', error);
      toast.error(t('saveSettingsError'));
    } else {
      toast.success(t('saveSettingsSuccess'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-foreground">{t('reminderSettingsTitle')}</h3>
          <p className="text-sm text-muted-foreground">{t('reminderSettingsSubtitle')}</p>
        </div>
      </div>

      {/* Email Opt-in */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg bg-muted/50 border border-border space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">{t('emailReminders')}</Label>
              <p className="text-xs text-muted-foreground">{t('emailRemindersDescription')}</p>
            </div>
          </div>
          <Switch
            checked={settings.email_opt_in}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_opt_in: checked }))}
          />
        </div>

        {settings.email_opt_in && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pl-8 space-y-4"
          >
            {/* Timezone display */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{t('timezoneLabel', { timezone: settings.timezone || '' })}</span>
            </div>

            {/* Bedtime Reminder */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Moon className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <Label className="text-sm">{t('bedtimeReminder')}</Label>
                  <p className="text-xs text-muted-foreground">{t('bedtimeReminderDescription')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={settings.bedtime_time || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, bedtime_time: e.target.value }))}
                  className="w-24 text-sm"
                  disabled={!settings.bedtime_enabled}
                />
                <Switch
                  checked={settings.bedtime_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, bedtime_enabled: checked }))}
                />
              </div>
            </div>

            {/* Story Reminder */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <Label className="text-sm">{t('storyTimeReminder')}</Label>
                  <p className="text-xs text-muted-foreground">{t('storyTimeReminderDescription')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={settings.story_time || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, story_time: e.target.value }))}
                  className="w-24 text-sm"
                  disabled={!settings.story_enabled}
                />
                <Switch
                  checked={settings.story_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, story_enabled: checked }))}
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t('saving')}
          </>
        ) : (
          t('saveSettings')
        )}
      </Button>
    </div>
  );
}
