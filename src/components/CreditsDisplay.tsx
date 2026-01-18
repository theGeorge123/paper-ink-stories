import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/hooks/useLanguage";

export default function CreditsDisplay() {
  const { credits, subscription, hasActiveSubscription, isLoading } =
    useCredits();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardContent className="p-6">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (hasActiveSubscription) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full">
                <Crown className="w-6 h-6 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-amber-900 dark:text-amber-100">
                  {t('premiumMember')}
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('unlimitedAccess')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pricing")}
              className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
            >
              {t('manage')}
            </Button>
          </div>
          {subscription?.cancel_at_period_end && (
            <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your subscription will end on{" "}
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-full">
              <Coins className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-purple-900 dark:text-purple-100">
                {credits} {t('credits')}
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {t('creditCost')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/pricing")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            {t('getMore')}
          </Button>
        </div>

        {credits < 3 && (
          <div className="mt-3 p-3 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              {credits === 0
                ? "You're out of credits! Purchase more or subscribe for unlimited access."
                : credits < 2
                ? "Low on credits! You need 2 credits to create a hero and 1 to generate a story."
                : "You have enough credits for 1 hero creation."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
