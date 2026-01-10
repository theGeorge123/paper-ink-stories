import { useEffect, useState } from 'react';
import { getDemoHero } from '@/lib/demoStorage';
import { generateDemoStory } from '@/lib/demoStoryTemplate';
import Reader from '@/components/Reader';

export default function DemoReader() {
  const [story, setStory] = useState(null);
  const [heroName, setHeroName] = useState('');

  useEffect(() => {
    const hero = getDemoHero();
    if (hero) {
      const generatedStory = generateDemoStory(hero);
      setStory(generatedStory);
      setHeroName(hero.heroName);
    }
  }, []);

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Generating your story...</p>
        </div>
      </div>
    );
  }

  return <Reader story={story} heroName={heroName} isDemo={true} />;
}
