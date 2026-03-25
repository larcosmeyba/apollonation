// Stripe product and price IDs for each subscription tier
export const STRIPE_TIERS = {
  basic: {
    product_id: "prod_TwIIBeto2Gx7U2",
    price_id: "price_1SyPhqF9HbQtUkYZbh8Zj7sq",
    name: "Apollo Core",
    price: 19.99,
  },
  pro: {
    product_id: "prod_TwIJWLZwxjtvKC",
    price_id: "price_1SyPjFF9HbQtUkYZIMD51tFz",
    name: "Apollo Fuel",
    price: 49.99,
  },
  elite: {
    product_id: "prod_TwIKmegnVoo027",
    price_id: "price_1SyPkIF9HbQtUkYZ5uth38pm",
    name: "Apollo Elite",
    price: 99.99,
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_TIERS;
