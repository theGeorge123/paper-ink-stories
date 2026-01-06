import { motion } from "framer-motion";
import { Book, Mail, ArrowLeft, MessageCircle, HelpCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

export default function Support() {
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
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
            Support
          </h1>
          <p className="text-muted-foreground mb-12">
            We're here to help make bedtime magical.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Email Support Card */}
            <motion.a
              href="mailto:info@paperink.eu"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="block p-6 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground mb-1">
                    Email Us
                  </h2>
                  <p className="text-primary font-medium mb-2">
                    info@paperink.eu
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24 hours.
                  </p>
                </div>
              </div>
            </motion.a>

            {/* FAQ Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-2xl bg-card/50 border border-border/50"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground mb-1">
                    Common Questions
                  </h2>
                  <ul className="text-sm text-muted-foreground space-y-2 mt-3">
                    <li>• How do I create a new character?</li>
                    <li>• Can I change my child's age band?</li>
                    <li>• How does the story memory work?</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50">
            <div className="flex items-start gap-4">
              <MessageCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground mb-2">
                  Feedback Welcome
                </h3>
                <p className="text-muted-foreground">
                  Have ideas for new features or improvements? We'd love to hear from you! 
                  Your feedback helps us create better bedtime stories for families everywhere.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link to="/about" className="text-primary hover:underline text-sm">
              ← Learn more about Paper & Ink
            </Link>
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
