import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { GuestModeProvider } from "@/hooks/useGuestMode";
import AuthPromptModal from "@/components/AuthPromptModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import SkeletonLoader from "@/components/SkeletonLoader";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ReadEpisode from "./pages/ReadEpisode";
import DemoHero from "./pages/DemoHero";
import DemoQuestions from "./pages/DemoQuestions";
import About from "./pages/About";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateCharacter = lazy(() => import("./pages/CreateCharacter"));
const CreateQuestions = lazy(() => import("./pages/CreateQuestions"));
const Questions = lazy(() => import("./pages/Questions"));
const Reader = lazy(() => import("./pages/Reader"));
const DemoReader = lazy(() => import("./pages/DemoReader"));
const StoryHistory = lazy(() => import("./pages/StoryHistory"));

const PageLoader = () => <SkeletonLoader type="page" />;
const ReaderLoader = () => <SkeletonLoader type="reader" />;

// App component with providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <GuestModeProvider>
            <TooltipProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground"
              >
                Skip to content
              </a>
              <Toaster />
              <Sonner />
              <AuthPromptModal />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                  path="/dashboard"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn’t load your dashboard.">
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/create"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn’t load the character creator.">
                      <Suspense fallback={<PageLoader />}>
                        <CreateCharacter />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/create/questions"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn’t load the story questions.">
                      <Suspense fallback={<PageLoader />}>
                        <CreateQuestions />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route path="/read" element={<ReadEpisode />} />
                <Route
                  path="/read/:storyId"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn’t load the reader.">
                      <Suspense fallback={<ReaderLoader />}>
                        <Reader />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/read/:storyId/questions"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn’t load the story questions.">
                      <Suspense fallback={<PageLoader />}>
                        <Questions />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/questions/:characterId"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn't load the story questions.">
                      <Suspense fallback={<PageLoader />}>
                        <Questions />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/stories/:characterId"
                  element={
                    <ErrorBoundary fallbackMessage="We couldn't load the story history.">
                      <Suspense fallback={<PageLoader />}>
                        <StoryHistory />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/demo-hero"
                  element={
                    <ErrorBoundary fallbackMessage="Demo temporarily unavailable">
                      <DemoHero />
                    </ErrorBoundary>
                  }
                />
                <Route path="/demo-questions" element={<DemoQuestions />} />
                <Route
                  path="/demo-reader"
                  element={
                    <ErrorBoundary fallbackMessage="Demo temporarily unavailable">
                      <Suspense fallback={<ReaderLoader />}>
                        <DemoReader />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/demo"
                  element={
                    <ErrorBoundary fallbackMessage="Demo temporarily unavailable">
                      <Suspense fallback={<ReaderLoader />}>
                        <DemoReader />
                      </Suspense>
                    </ErrorBoundary>
                  }
                />
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
