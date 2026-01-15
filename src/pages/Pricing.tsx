import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Coins, Check, ArrowLeft, Loader2, Sparkles, Star, Gift, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useLanguage } from "@/hooks/useLanguage";

// Stripe Price IDs
const STRIPE_PRICES = {
  monthly: "price_1SpwgaCZm9ae9U5WvHGAsot1",
  yearly: "price_1SpwgPCZm9ae9U5WqlyHlH1E",
};

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_amount: number;
  currency: string;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { credits, subscription, hasActiveSubscription, refreshCredits } = useCredits();
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");

  useEffect(() => {
    fetchCreditPackages();
  }, []);

  const fetchCreditPackages = async () => {
    const { data, error } = await supabase
      .from("credit_packages")
      .select("id, name, credits, price_amount, currency")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching credit packages:", error);
    } else {
      setCreditPackages((data as CreditPackage[]) || []);
    }
  };

  const handleSubscribe = async (period: "monthly" | "yearly") => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "subscription",
          priceId: STRIPE_PRICES[period],
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyCredits = async (packageId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoadingPackageId(packageId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "credits",
          packageId,
          successUrl: `${window.location.origin}/dashboard?purchase=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPackageId(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-subscription", {
        body: {
          action: "portal",
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast.error("Failed to open billing portal. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const value = amount / 100;
    if (currency === "EUR") {
      return `€${value.toFixed(2).replace('.00', '')}`;
    }
    return `${value.toFixed(2)} ${currency}`;
  };

  return (
    <div className="min-h-screen bg-background paper-texture">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard') || 'Back'}
          </Button>
          
          {user && (
            <Badge variant="secondary" className="text-base px-4 py-2 bg-primary/10 border-primary/20">
              <Coins className="w-4 h-4 mr-2 text-primary" />
              {credits} {t('credits') || 'credits'}
            </Badge>
          )}
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">
            {t('pricingTitle') || 'Choose Your Plan'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('pricingSubtitle') || 'Create magical bedtime stories for your children'}
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-muted border">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t('monthlyPlan') || 'Monthly'}
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === "yearly"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t('yearlyPlan') || 'Yearly'}
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
                {t('savingsLabel') || 'Save 17%'}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Subscription Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-lg mx-auto mb-16"
        >
          <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            {/* Premium badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
            
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                Paper & Ink Unlimited
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Unlimited stories and heroes for your family
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Price */}
              <div className="text-center py-4">
                {billingPeriod === "yearly" ? (
                  <>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-5xl font-bold text-foreground">€79</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      That's just €6.58/month
                    </p>
                  </>
                ) : (
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-foreground">€7.90</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 pt-4 border-t">
                {[
                  { icon: Zap, text: t('unlimitedHeroes') || 'Unlimited hero creation' },
                  { icon: Star, text: t('unlimitedStories') || 'Unlimited story generation' },
                  { icon: Sparkles, text: t('priorityGeneration') || 'Priority AI generation' },
                  { icon: Gift, text: t('cancelAnytime') || 'Cancel anytime' },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            
            <CardFooter className="pt-2 pb-6">
              {hasActiveSubscription ? (
                <Button
                  className="w-full h-12 text-base"
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    t('manageSubscription') || "Manage Subscription"
                  )}
                </Button>
              ) : (
                <Button
                  className="w-full h-12 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={() => handleSubscribe(billingPeriod)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {t('subscribeNow') || 'Subscribe Now'}
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>

        {/* Credit Packages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
              {t('buyCredits') || 'Or Buy Credits'}
            </h2>
            <p className="text-muted-foreground">
              Pay as you go, no subscription required
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {creditPackages.map((pkg, idx) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all hover:border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Coins className="w-5 h-5 text-primary" />
                      {pkg.name}
                    </CardTitle>
                    <CardDescription>
                      {pkg.credits} credits
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-2xl font-bold text-foreground">
                      {formatPrice(pkg.price_amount, pkg.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      €{(pkg.price_amount / 100 / pkg.credits).toFixed(2)} per credit
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleBuyCredits(pkg.id)}
                      disabled={loadingPackageId === pkg.id}
                    >
                      {loadingPackageId === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        t('purchase') || "Purchase"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How Credits Work */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-8 bg-muted/50 rounded-2xl border"
        >
          <h3 className="font-serif text-xl font-semibold mb-6 text-center">
            {t('howCreditsWork') || 'How Credits Work'}
          </h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Credits per Hero</p>
                <p className="text-sm text-muted-foreground">
                  {t('heroCredits') || 'Create a unique hero with AI-generated portrait'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-secondary-foreground">1</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Credit per Story</p>
                <p className="text-sm text-muted-foreground">
                  {t('storyCredits') || 'Generate a personalized bedtime story'}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {t('freeCreditsNote') || 'New accounts start with 5 free credits (2 heroes + 1 story)'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
