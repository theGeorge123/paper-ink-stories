import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Coins, Check, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const { credits, subscription, hasActiveSubscription, refreshCredits } = useCredits();
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditPackages();
  }, []);

  const fetchCreditPackages = async () => {
    const { data, error } = await supabase
      .from("credit_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching credit packages:", error);
      toast.error("Failed to load credit packages");
    } else {
      setCreditPackages(data || []);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          type: "subscription",
          priceId: import.meta.env.VITE_STRIPE_SUBSCRIPTION_PRICE_ID,
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
      return `€${value.toFixed(2)}`;
    }
    return `${value.toFixed(2)} ${currency}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create magical bedtime stories for your children. Start with 5 free credits or subscribe for unlimited access.
          </p>
          {user && (
            <div className="mt-4">
              <Badge variant="secondary" className="text-base px-4 py-2">
                <Coins className="w-4 h-4 mr-2" />
                Current Balance: {credits} credits
              </Badge>
            </div>
          )}
        </div>

        <Tabs defaultValue="subscription" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="credits">Buy Credits</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription" className="space-y-6">
            <Card className="max-w-md mx-auto bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-2 border-amber-300 dark:border-amber-700">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-600" />
                    Premium Unlimited
                  </CardTitle>
                  <Badge className="bg-amber-500 hover:bg-amber-600">
                    Best Value
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  Unlimited stories and heroes for your family
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-900 dark:text-amber-100">
                    €7.90
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">per month</div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Unlimited hero creation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Unlimited story generation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Priority AI generation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Cancel anytime</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Support development</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                {hasActiveSubscription ? (
                  <Button
                    className="w-full"
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
                      "Manage Subscription"
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white"
                    onClick={handleSubscribe}
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
                        Subscribe Now
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="credits" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditPackages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-purple-600" />
                      {pkg.name}
                    </CardTitle>
                    <CardDescription>
                      {Math.floor(pkg.credits / 2)} heroes or {pkg.credits} stories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                      {formatPrice(pkg.price_amount, pkg.currency)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {(pkg.price_amount / 100 / pkg.credits).toFixed(2)} per credit
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleBuyCredits(pkg.id)}
                      disabled={loadingPackageId === pkg.id}
                    >
                      {loadingPackageId === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Purchase"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8">
              <p>Need more credits? Contact support for custom packages.</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-12 p-6 bg-white/50 dark:bg-gray-800/50 rounded-lg text-center">
          <h3 className="text-xl font-semibold mb-3">How Credits Work</h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-purple-600 mb-2">2 Credits</div>
              <p className="text-gray-600 dark:text-gray-400">
                Create a unique hero with AI-generated portrait
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600 mb-2">1 Credit</div>
              <p className="text-gray-600 dark:text-gray-400">
                Generate a personalized bedtime story
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            New accounts start with 5 free credits (2 heroes + 1 story)
          </p>
        </div>
      </div>
    </div>
  );
}
