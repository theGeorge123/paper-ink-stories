-- Strengthen ratings policies to ensure users can rate their own stories and update scores
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can insert own ratings' AND tablename = 'ratings'
  ) THEN
    DROP POLICY "Users can insert own ratings" ON public.ratings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'Users can update own ratings' AND tablename = 'ratings'
  ) THEN
    DROP POLICY "Users can update own ratings" ON public.ratings;
  END IF;
END $$;

CREATE POLICY "Users can insert ratings for their stories"
  ON public.ratings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ratings for their stories"
  ON public.ratings
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_id AND s.user_id = auth.uid()
    )
  );
