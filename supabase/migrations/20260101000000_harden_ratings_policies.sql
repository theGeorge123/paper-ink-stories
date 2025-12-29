-- Ensure unique pairing between user and story for ratings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ratings_user_story_unique'
  ) THEN
    ALTER TABLE public.ratings
    ADD CONSTRAINT ratings_user_story_unique UNIQUE (user_id, story_id);
  END IF;
END $$;

-- Guarantee RLS is enabled
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Policies for insert/update ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own ratings'
  ) THEN
    CREATE POLICY "Users can insert own ratings"
      ON public.ratings
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own ratings'
  ) THEN
    CREATE POLICY "Users can update own ratings"
      ON public.ratings
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
