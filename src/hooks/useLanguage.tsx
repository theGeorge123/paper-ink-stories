import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, t as translate, TranslationKey } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const { user } = useAuth();

  useEffect(() => {
    // Load language from profile if user is logged in
    if (user) {
      supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.language) {
            setLanguageState(data.language as Language);
          }
        });
    }
  }, [user]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ language: lang })
        .eq('id', user.id);
    }
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    return translate(key, language, params);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
