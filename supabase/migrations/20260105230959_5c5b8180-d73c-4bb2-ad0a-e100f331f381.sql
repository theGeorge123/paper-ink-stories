-- Add feedback questionnaire columns to stories table
ALTER TABLE public.stories 
  ADD COLUMN IF NOT EXISTS child_state_after_story TEXT NULL,
  ADD COLUMN IF NOT EXISTS reuse_intent_tomorrow TEXT NULL,
  ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ NULL;

-- Add check constraint for child_state_after_story (using validation trigger instead of CHECK for flexibility)
CREATE OR REPLACE FUNCTION public.validate_story_feedback()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate child_state_after_story
  IF NEW.child_state_after_story IS NOT NULL AND 
     NEW.child_state_after_story NOT IN ('calmer', 'same', 'more_energetic') THEN
    RAISE EXCEPTION 'child_state_after_story must be one of: calmer, same, more_energetic';
  END IF;
  
  -- Validate reuse_intent_tomorrow
  IF NEW.reuse_intent_tomorrow IS NOT NULL AND 
     NEW.reuse_intent_tomorrow NOT IN ('yes', 'maybe', 'no') THEN
    RAISE EXCEPTION 'reuse_intent_tomorrow must be one of: yes, maybe, no';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_story_feedback_trigger ON public.stories;
CREATE TRIGGER validate_story_feedback_trigger
  BEFORE INSERT OR UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_story_feedback();

-- Add index on feedback_submitted_at for querying
CREATE INDEX IF NOT EXISTS idx_stories_feedback_submitted_at 
  ON public.stories (feedback_submitted_at) 
  WHERE feedback_submitted_at IS NOT NULL;