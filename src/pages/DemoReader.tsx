import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Reader from '@/components/Reader';
import { buildDemoRoute, getDemoHero } from '@/lib/demoStorage';
import { generateDemoStory } from '@/lib/demoStoryTemplate';
import type { DemoStoryRecord } from '@/lib/demoStoryTemplate';

export default function DemoReader() {
  const navigate = useNavigate();
  const [story, setStory] = useState<DemoStoryRecord | null>(null);
  const [heroName, setHeroName] = useState<string | null>(null);

  useEffect(() => {
    const hero = getDemoHero();

    if (!hero) {
      navigate(buildDemoRoute('/demo-hero'));
      return;
    }

    const demoStory = generateDemoStory(hero);
    setHeroName(hero.heroName);
    setStory(demoStory);
  }, [navigate]);

  if (!story) {
    return <div>Loading your adventure...</div>;
  }

  return <Reader story={story} heroName={heroName} isDemo={true} />;
}
