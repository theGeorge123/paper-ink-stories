import { DEMO_STORY } from '@/lib/preMadeDemoStory';
import Reader from '@/components/Reader';

// Placeholder cover image for demo story - a moonlit garden scene
// In production, this could be a pre-generated cover image stored in public assets
const DEMO_COVER_IMAGE = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=800&fit=crop&q=80';

export default function DemoReader() {
  return (
    <Reader 
      story={DEMO_STORY} 
      heroName="Luna" 
      isDemo={true}
      heroImageUrl={DEMO_COVER_IMAGE}
    />
  );
}
