-- Create reminder_settings table for email reminders
CREATE TABLE public.reminder_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_opt_in BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT,
  bedtime_enabled BOOLEAN NOT NULL DEFAULT false,
  bedtime_time TEXT,
  story_enabled BOOLEAN NOT NULL DEFAULT false,
  story_time TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own settings
CREATE POLICY "Users can view own reminder settings"
  ON public.reminder_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminder settings"
  ON public.reminder_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminder settings"
  ON public.reminder_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();