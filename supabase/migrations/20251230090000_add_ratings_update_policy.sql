-- Add update policy for ratings allowing users to modify their own entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polname = 'Users can update own ratings'
      AND polrelid = 'public.ratings'::regclass
  ) THEN
    CREATE POLICY "Users can update own ratings"
      ON public.ratings
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;
