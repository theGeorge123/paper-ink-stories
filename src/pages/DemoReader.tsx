import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Reader from '@/components/Reader';
import { buildDemoRoute, getDemoHero, getDemoIdFromCookie } from '@/lib/demoStorage';
import { generateDemoStory } from '@/lib/demoStoryTemplate';
import type { DemoStoryRecord } from '@/lib/demoStoryTemplate';

export default function DemoReader() {
  const navigate = useNavigate();
  const [story, setStory] = useState<DemoStoryRecord | null>(null);
  const [heroName, setHeroName] = useState<string | null>(null);

  useEffect(() => {
    const demoId = getDemoIdFromCookie();
    const hero = getDemoHero();

    // Validate demo session exists
    if (!demoId || !hero) {
      navigate(buildDemoRoute('/demo-hero'));
      return;
    }

    // Generate story from template using saved hero data
    const generatedStory = generateDemoStory(hero);
    setHeroName(hero.heroName);
    setStory(generatedStory);
  }, [navigate]);

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-950 to-slate-950">
        <p className="text-white/70">Loading your adventure...</p>
      </div>
    );
  }

  return <Reader story={story} heroName={heroName} isDemo={true} />;
}
