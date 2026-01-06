import { motion } from "framer-motion";
import { Book, Mail, ArrowLeft, MessageCircle, ChevronDown } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Support() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const faqs = [
    { question: t('supportFaqQ1'), answer: t('supportFaqA1') },
    { question: t('supportFaqQ2'), answer: t('supportFaqA2') },
    { question: t('supportFaqQ3'), answer: t('supportFaqA3') },
  ];

  return (
    <div className="min-h-screen bg-background paper-texture">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
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
            {t('supportTitle')}
          </h1>
          <p className="text-muted-foreground mb-12">
            {t('supportSubtitle')}
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
                    {t('supportEmailUs')}
                  </h2>
                  <p className="text-primary font-medium mb-2">
                    info@paperink.eu
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('supportEmailResponse')}
                  </p>
                </div>
              </div>
            </motion.a>

            {/* FAQ Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-2xl bg-card/50 border border-border/50 md:col-span-2"
            >
              <h2 className="font-serif text-lg font-bold text-foreground mb-4">
                {t('supportFaq')}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-foreground hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50">
            <div className="flex items-start gap-4">
              <MessageCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground mb-2">
                  {t('supportFeedback')}
                </h3>
                <p className="text-muted-foreground">
                  {t('supportFeedbackText')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <Link to="/about" className="text-primary hover:underline text-sm">
              {t('supportBackToAbout')}
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
