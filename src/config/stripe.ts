// Stripe product and price IDs for each subscription tier
export const STRIPE_TIERS = {
  basic: {
    product_id: "prod_TwIIBeto2Gx7U2",
    price_id: "price_1SyPhqF9HbQtUkYZbh8Zj7sq",
    name: "Essential",
    price: 20,
  },
  pro: {
    product_id: "prod_TwIJWLZwxjtvKC",
    price_id: "price_1SyPjFF9HbQtUkYZIMD51tFz",
    name: "Premier",
    price: 59,
  },
  elite: {
    product_id: "prod_TwIKmegnVoo027",
    price_id: "price_1SyPkIF9HbQtUkYZ5uth38pm",
    name: "Elite",
    price: 99,
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_TIERS;
