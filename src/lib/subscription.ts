// Unified subscription model. Apple App Store and Google Play handle billing;
// RevenueCat is the verification layer. The DB column `is_subscribed` is the
// source of truth — write entitlement state from the server, read on the client.

export type SubscriptionPlan = "monthly" | "annual";
export type SubscriptionSource = "app_store" | "play_store" | "manual";

export interface Subscription {
  isSubscribed: boolean;
  plan: SubscriptionPlan | null;
  expiresAt: Date | null;
  source: SubscriptionSource | null;
}

/**
 * Derive subscription state from a profile row.
 * Treats expired entries as not subscribed even if `is_subscribed` is still true,
 * which can happen briefly between the user's expiration moment and the webhook write.
 */
export const subscriptionFromProfile = (profile: {
  is_subscribed?: boolean | null;
  subscription_plan?: string | null;
  subscription_store?: string | null;
  subscription_expires_at?: string | null;
} | null | undefined): Subscription => {
  const expiresAt = profile?.subscription_expires_at
    ? new Date(profile.subscription_expires_at)
    : null;
  return {
    isSubscribed: !!profile?.is_subscribed,
    plan: (profile?.subscription_plan as SubscriptionPlan | null) ?? null,
    expiresAt,
    source: (profile?.subscription_store as SubscriptionSource | null) ?? null,
  };
};

export const isPremium = (s: Subscription | null | undefined): boolean => {
  if (!s?.isSubscribed) return false;
  // Manual grants have no expiry; treat as always premium.
  if (!s.expiresAt) return true;
  return s.expiresAt.getTime() > Date.now();
};
