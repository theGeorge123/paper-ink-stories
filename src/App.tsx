import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { GuestModeProvider } from "@/hooks/useGuestMode";
import AuthPromptModal from "@/components/AuthPromptModal";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import CreateCharacter from "./pages/CreateCharacter";
import CreateQuestions from "./pages/CreateQuestions";
import Reader from "./pages/Reader";
import ReadEpisode from "./pages/ReadEpisode";
import DemoHero from "./pages/DemoHero";
import DemoReader from "./pages/DemoReader";
import About from "./pages/About";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// App component with providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <GuestModeProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AuthPromptModal />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/create" element={<CreateCharacter />} />
                <Route path="/create/questions" element={<CreateQuestions />} />
                <Route path="/read" element={<ReadEpisode />} />
                <Route path="/read/:storyId" element={<Reader />} />
                <Route path="/demo-hero" element={<DemoHero />} />
                <Route path="/demo" element={<DemoReader />} />
                <Route path="/about" element={<About />} />
                <Route path="/support" element={<Support />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </GuestModeProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
