import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GuestModeContextType {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  authPromptOpen: boolean;
  authPromptAction: string;
  openAuthPrompt: (action: string) => void;
  closeAuthPrompt: () => void;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

export function GuestModeProvider({ children }: { children: ReactNode }) {
  const [isGuest, setIsGuest] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState('');

  const openAuthPrompt = useCallback((action: string) => {
    setAuthPromptAction(action);
    setAuthPromptOpen(true);
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptOpen(false);
    setAuthPromptAction('');
  }, []);

  return (
    <GuestModeContext.Provider
      value={{
        isGuest,
        setIsGuest,
        authPromptOpen,
        authPromptAction,
        openAuthPrompt,
        closeAuthPrompt,
      }}
    >
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
