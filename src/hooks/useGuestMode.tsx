import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GuestModeContextType {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  showAuthPrompt: (action: string) => void;
  authPromptOpen: boolean;
  authPromptAction: string;
  closeAuthPrompt: () => void;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState('');

  const showAuthPrompt = useCallback((action: string) => {
    setAuthPromptAction(action);
    setAuthPromptOpen(true);
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptOpen(false);
    setAuthPromptAction('');
  }, []);

  return (
    <GuestModeContext.Provider value={{
      isGuest,
      setIsGuest,
      showAuthPrompt,
      authPromptOpen,
      authPromptAction,
      closeAuthPrompt,
    }}>
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  const context = useContext(GuestModeContext);
  if (context === undefined) {
    throw new Error('useGuestMode must be used within a GuestModeProvider');
  }
  return context;
}
