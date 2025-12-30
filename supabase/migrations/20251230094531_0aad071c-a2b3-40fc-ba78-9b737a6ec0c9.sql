-- Add DELETE policy for reminder_settings table
CREATE POLICY "Users can delete own reminder settings"
ON public.reminder_settings
FOR DELETE
USING (auth.uid() = user_id);