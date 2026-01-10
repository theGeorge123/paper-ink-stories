import { DEMO_STORY } from '@/lib/preMadeDemoStory';
import Reader from '@/components/Reader';

export default function DemoReader() {
  return <Reader story={DEMO_STORY} heroName="Luna" isDemo={true} />;
}
