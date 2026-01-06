import { motion } from "framer-motion";
import { Book, Heart, Moon, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export default function About() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background paper-texture">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-foreground">{t('appName')}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-8">
            About Paper & Ink
          </h1>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">Our Mission</h2>
              </div>
              <p>
                Paper & Ink was born from a simple belief: every child deserves a bedtime story 
                that's as unique as they are. We combine the magic of storytelling with the power 
                of AI to create personalized adventures that grow with your child.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">Sleep-Engineered Stories</h2>
              </div>
              <p>
                Every story is crafted with science-backed techniques to help children wind down 
                for sleep. Our narratives use progressively calming language, rhythmic pacing, 
                and soothing imagery designed to guide little ones gently toward dreamland.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-serif text-xl font-bold text-foreground">Infinite Adventures</h2>
              </div>
              <p>
                Unlike traditional storybooks, Paper & Ink remembers. Your child's hero remembers 
                the dragon they befriended yesterday, the magical forest they explored, and the 
                lessons they learned. Each new adventure builds on the last, creating a rich, 
                continuous world that's uniquely theirs.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-serif text-xl font-bold text-foreground">For Parents, By Parents</h2>
              <p>
                We understand the struggle of finding the right bedtime story night after night. 
                That's why we created Paper & Ink—to give parents a magical tool that makes 
                bedtime something to look forward to, for both children and parents alike.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Questions or feedback?{" "}
              <Link to="/support" className="text-primary hover:underline">
                Contact our support team
              </Link>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {t('appName')}. {t('madeWithLove')}</p>
        </div>
      </footer>
    </div>
  );
}
