import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { buildDemoRoute, getDemoHero, getDemoIdFromCookie } from "@/lib/demoStorage";
import { generateDemoStory } from "@/lib/demoStoryTemplate";
import Reader from "./Reader";

export default function DemoReader() {
  const navigate = useNavigate();
  const demoId = getDemoIdFromCookie();
  const hero = getDemoHero();

  useEffect(() => {
    // If no demo session, redirect to hero creation
    if (!demoId) {
      navigate(buildDemoRoute("/demo-hero"));
      return;
    }

    // If no hero, redirect to hero creation
    if (!hero) {
      navigate(buildDemoRoute("/demo-hero"));
      return;
    }
  }, [demoId, hero, navigate]);

  // If we don't have a hero yet, show loading
  if (!hero) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your story...</p>
        </div>
      </div>
    );
  }

  // Generate story from template
  const generatedStory = generateDemoStory(hero);

  // Use Reader component with the generated story
  return <Reader story={generatedStory} isDemo={true} />;
}
