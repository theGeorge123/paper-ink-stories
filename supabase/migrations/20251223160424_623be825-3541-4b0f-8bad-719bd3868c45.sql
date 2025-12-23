-- Create profiles table for user settings
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('nl', 'en', 'sv')),
  parent_pin INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create characters table (The DNA - Constant)
CREATE TABLE public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  traits TEXT[] NOT NULL DEFAULT '{}',
  sidekick_name TEXT,
  sidekick_archetype TEXT,
  icon TEXT NOT NULL DEFAULT 'knight',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stories table (The Container - Variable)
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  title TEXT,
  length_setting TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (length_setting IN ('SHORT', 'MEDIUM', 'LONG')),
  current_page INTEGER NOT NULL DEFAULT 0,
  story_state JSONB NOT NULL DEFAULT '{"location": null, "inventory": [], "summary": null}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pages table (The Content)
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, page_number)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Characters policies
CREATE POLICY "Users can view own characters" ON public.characters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own characters" ON public.characters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own characters" ON public.characters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own characters" ON public.characters
  FOR DELETE USING (auth.uid() = user_id);

-- Stories policies (access through character ownership)
CREATE POLICY "Users can view own stories" ON public.stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.characters 
      WHERE characters.id = stories.character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own stories" ON public.stories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.characters 
      WHERE characters.id = character_id 
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own stories" ON public.stories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.characters 
      WHERE characters.id = stories.character_id 
      AND characters.user_id = auth.uid()
    )
  );

-- Pages policies (access through story -> character ownership)
CREATE POLICY "Users can view own pages" ON public.pages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories
      JOIN public.characters ON characters.id = stories.character_id
      WHERE stories.id = pages.story_id
      AND characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own pages" ON public.pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stories
      JOIN public.characters ON characters.id = stories.character_id
      WHERE stories.id = story_id
      AND characters.user_id = auth.uid()
    )
  );

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, language)
  VALUES (new.id, 'en');
  RETURN new;
END;
$$;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_characters_updated_at
  BEFORE UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();