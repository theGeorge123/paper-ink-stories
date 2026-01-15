import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Subscription {
  id: string;
  status: string;
  plan_type: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface CreditsContextType {
  credits: number;
  subscription: Subscription | null;
  hasActiveSubscription: boolean;
  isLoading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hasActiveSubscription =
    subscription?.status === "active" &&
    new Date(subscription.current_period_end) > new Date();

  const fetchCredits = async () => {
    if (!user) {
      setCredits(0);
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch credits from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching credits:", profileError);
      } else {
        setCredits(profile?.credits || 0);
      }

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subError) {
        console.error("Error fetching subscription:", subError);
      } else {
        setSubscription(subData);
      }
    } catch (error) {
      console.error("Error in fetchCredits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();

    // Subscribe to realtime updates for profile credits
    if (user) {
      const profileSubscription = supabase
        .channel(`profile-credits-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.new && "credits" in payload.new) {
              setCredits((payload.new as { credits: number }).credits);
            }
          }
        )
        .subscribe();

      // Subscribe to realtime updates for subscriptions
      const subscriptionChannel = supabase
        .channel(`subscriptions-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refresh subscription data when any change occurs
            fetchCredits();
          }
        )
        .subscribe();

      return () => {
        profileSubscription.unsubscribe();
        subscriptionChannel.unsubscribe();
      };
    }
  }, [user?.id]);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        subscription,
        hasActiveSubscription,
        isLoading,
        refreshCredits: fetchCredits,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}
