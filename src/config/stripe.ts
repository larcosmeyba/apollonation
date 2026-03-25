// Stripe product and price IDs for each subscription tier
export const STRIPE_TIERS = {
  basic: {
    product_id: "prod_TwIIBeto2Gx7U2",
    price_id: "price_1SyPhqF9HbQtUkYZbh8Zj7sq",
    name: "Apollo Core",
    price: 20,
  },
  pro: {
    product_id: "prod_UDPmpVYjmr8FVL",
    price_id: "price_1TEywfF9HbQtUkYZncLrWtCS",
    name: "Apollo Fuel",
    price: 50,
  },
  elite: {
    product_id: "prod_UDPmkqN8R2ZaPc",
    price_id: "price_1TEyx3F9HbQtUkYZVg3iZ18G",
    name: "Apollo Elite",
    price: 100,
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_TIERS;
