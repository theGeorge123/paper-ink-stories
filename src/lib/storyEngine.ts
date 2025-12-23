import { supabase } from '@/integrations/supabase/client';

export interface StoryState {
  location: string | null;
  inventory: string[];
  summary: string | null;
  mood?: 'calm' | 'exciting';
  humor?: 'serious' | 'funny';
}

export interface Character {
  id: string;
  name: string;
  archetype: string;
  traits: string[];
  sidekick_name: string | null;
  sidekick_archetype: string | null;
}

export interface Story {
  id: string;
  character_id: string;
  is_active: boolean;
  title: string | null;
  length_setting: 'SHORT' | 'MEDIUM' | 'LONG';
  current_page: number;
  story_state: StoryState;
}

export interface Page {
  id: string;
  story_id: string;
  page_number: number;
  content: string;
}

export type StoryPhase = 'SETUP' | 'JOURNEY' | 'WINDDOWN';

const LENGTH_PAGES = {
  SHORT: 5,
  MEDIUM: 10,
  LONG: 15,
};

export function getStoryPhase(currentPage: number, lengthSetting: 'SHORT' | 'MEDIUM' | 'LONG'): StoryPhase {
  const totalPages = LENGTH_PAGES[lengthSetting];
  const progress = currentPage / totalPages;
  
  if (progress < 0.25) return 'SETUP';
  if (progress < 0.75) return 'JOURNEY';
  return 'WINDDOWN';
}

export function getPhaseGuidance(phase: StoryPhase): string {
  switch (phase) {
    case 'SETUP':
      return 'Introduce the setting and establish the characters. Set up an intriguing situation or problem.';
    case 'JOURNEY':
      return 'The adventure unfolds. Include discoveries, challenges, and moments of wonder. Build tension gently.';
    case 'WINDDOWN':
      return 'Begin resolving the story. Lead toward a satisfying, peaceful conclusion perfect for bedtime.';
  }
}

export interface GeneratePageResult {
  page_text: string;
  new_state: StoryState;
  title?: string;
}

// Mock story generator for MVP testing
export function generateMockPage(
  character: Character,
  story: Story,
  previousPages: Page[],
  phase: StoryPhase
): GeneratePageResult {
  const heroName = character.name;
  const archetype = character.archetype;
  const traits = character.traits.join(' and ');
  const sidekick = character.sidekick_name;
  
  const mockStories: Record<StoryPhase, string[]> = {
    SETUP: [
      `Once upon a time, in a cozy corner of the Whispering Woods, there lived a ${traits} ${archetype} named ${heroName}. ${sidekick ? `With their faithful friend ${sidekick} by their side, they` : 'They'} had always dreamed of discovering something magical.`,
      `The morning sun painted golden streaks across ${heroName}'s window. Today felt different—special, somehow. ${sidekick ? `${sidekick} stirred from their comfortable spot, sensing the adventure that awaited.` : 'An adventure was about to begin.'}`,
      `${heroName} the ${archetype} stretched and yawned, ready for a new day. Little did they know that this would be no ordinary day in the Enchanted Valley.`,
    ],
    JOURNEY: [
      `${heroName} ventured deeper into the mysterious forest, ${sidekick ? `with ${sidekick} close behind.` : 'heart beating with excitement.'} Strange and wonderful flowers glowed softly in the twilight, lighting their path like tiny lanterns.`,
      `"Look!" ${heroName} whispered excitedly. Before them stood an ancient tree with a door carved into its trunk. ${sidekick ? `${sidekick} sniffed curiously at the doorknob.` : 'What secrets could lie within?'}`,
      `The kind forest spirits welcomed ${heroName} with gentle songs. They had heard of the ${traits} ${archetype} and were eager to help with the quest.`,
      `A puzzle! ${heroName} used their ${traits.split(' and ')[0]} nature to solve the riddle of the three stones. ${sidekick ? `${sidekick} cheered them on encouragingly.` : 'Each stone clicked into place.'}`,
    ],
    WINDDOWN: [
      `As the stars began to twinkle overhead, ${heroName} felt a warm sense of accomplishment. ${sidekick ? `${sidekick} snuggled close, equally content.` : 'The adventure had been wonderful.'}`,
      `The journey home was peaceful. ${heroName} carried treasured memories of new friends made and mysteries solved. ${sidekick ? `${sidekick} was already dreaming of their next adventure.` : 'Tomorrow would bring new wonders.'}`,
      `Safe and cozy once more, ${heroName} gazed at the moon through the window. "What a wonderful adventure," they whispered. ${sidekick ? `${sidekick} purred in agreement.` : ''} And as dreams began to dance in their mind, they knew more magic awaited in the morning.`,
    ],
  };
  
  const options = mockStories[phase];
  const randomIndex = Math.floor(Math.random() * options.length);
  const pageText = options[randomIndex];
  
  // Generate appropriate state updates based on phase
  const locations = ['Whispering Woods', 'Crystal Meadow', 'Starlight Grove', 'Moonbeam Valley', 'Cozy Hollow'];
  const items = ['glowing feather', 'friendship bracelet', 'magic acorn', 'starlight crystal'];
  
  const currentState = story.story_state as StoryState;
  const newState: StoryState = {
    location: locations[Math.floor(Math.random() * locations.length)],
    inventory: [...(currentState.inventory || [])],
    summary: `${heroName} continues their ${phase.toLowerCase()} adventure...`,
    mood: currentState.mood || 'calm',
    humor: currentState.humor || 'serious',
  };
  
  // Add item during journey phase occasionally
  if (phase === 'JOURNEY' && Math.random() > 0.6) {
    const newItem = items[Math.floor(Math.random() * items.length)];
    if (!newState.inventory.includes(newItem)) {
      newState.inventory.push(newItem);
    }
  }
  
  // Generate title on first page
  const title = story.current_page === 0 
    ? `${heroName} and the ${['Enchanted', 'Magical', 'Secret', 'Wonderful'][Math.floor(Math.random() * 4)]} ${['Forest', 'Journey', 'Discovery', 'Adventure'][Math.floor(Math.random() * 4)]}`
    : undefined;
  
  return {
    page_text: pageText,
    new_state: newState,
    title,
  };
}

// Main page generation function
export async function generatePage(
  storyId: string,
  directorSettings?: { mood?: 'calm' | 'exciting'; humor?: 'serious' | 'funny' }
): Promise<GeneratePageResult | null> {
  try {
    // Fetch story with character
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('*, characters(*)')
      .eq('id', storyId)
      .single();
    
    if (storyError || !story) {
      console.error('Error fetching story:', storyError);
      return null;
    }
    
    // Fetch last 2 pages for context
    const { data: recentPages, error: pagesError } = await supabase
      .from('pages')
      .select('*')
      .eq('story_id', storyId)
      .order('page_number', { ascending: false })
      .limit(2);
    
    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
    }
    
    // Calculate story phase
    const phase = getStoryPhase(story.current_page, story.length_setting as 'SHORT' | 'MEDIUM' | 'LONG');
    
    // Apply director settings to story state
    const storyState = story.story_state as unknown as StoryState;
    const currentState: StoryState = {
      location: storyState?.location ?? null,
      inventory: storyState?.inventory ?? [],
      summary: storyState?.summary ?? null,
      mood: directorSettings?.mood || storyState?.mood || 'calm',
      humor: directorSettings?.humor || storyState?.humor || 'serious',
    };
    
    // For MVP, use mock generator
    // In production, this would call the AI edge function
    const result = generateMockPage(
      story.characters as unknown as Character,
      { ...story, story_state: currentState } as Story,
      (recentPages || []) as Page[],
      phase
    );
    
    return result;
  } catch (error) {
    console.error('Error generating page:', error);
    return null;
  }
}

// Save generated page to database
export async function savePage(
  storyId: string,
  pageNumber: number,
  content: string,
  newState: StoryState,
  title?: string
): Promise<boolean> {
  try {
    // Insert new page
    const { error: pageError } = await supabase
      .from('pages')
      .insert({
        story_id: storyId,
        page_number: pageNumber,
        content,
      });
    
    if (pageError) {
      console.error('Error saving page:', pageError);
      return false;
    }
    
    // Update story state and current page
    const updateData: any = {
      current_page: pageNumber,
      story_state: newState,
    };
    
    if (title) {
      updateData.title = title;
    }
    
    const { error: storyError } = await supabase
      .from('stories')
      .update(updateData)
      .eq('id', storyId);
    
    if (storyError) {
      console.error('Error updating story:', storyError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving page:', error);
    return false;
  }
}

export function getTotalPages(lengthSetting: 'SHORT' | 'MEDIUM' | 'LONG'): number {
  return LENGTH_PAGES[lengthSetting];
}
