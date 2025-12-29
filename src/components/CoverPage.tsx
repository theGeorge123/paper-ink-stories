import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoverPageProps {
  title: string;
  heroImageUrl?: string | null;
  onOpen: () => void;
}

export default function CoverPage({ title, heroImageUrl, onOpen }: CoverPageProps) {
  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-gradient-to-b from-amber-100 via-amber-50 to-white p-0 m-0">
      {heroImageUrl && (
        <motion.img
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          src={heroImageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" aria-hidden="true" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white backdrop-blur-[2px]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm"
        >
          <BookOpen className="h-4 w-4" />
          <span>Papier &amp; Inkt</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-6 font-serif text-4xl sm:text-5xl"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8 }}
          className="mt-4 max-w-xl text-base text-white/80"
        >
          Een betoverende omslag voor jouw held. Klaar om het verhaal te openen?
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-10"
        >
          <Button size="lg" onClick={onOpen} className="bg-amber-400 text-amber-950 hover:bg-amber-300">
            Sla het boek open
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
