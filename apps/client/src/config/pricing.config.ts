export interface PricingTier {
  id: string;
  nameKey: string;
  descriptionKey: string;
  badgeKey?: string;
  popular?: boolean;
  price: {
    monthly: number;
    yearly: number;
  };
  productIds: {
    monthly: string;
    yearly: string;
  };
  featureKeys: string[];
  ctaKey: string;
  isFree?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    nameKey: "tiers.starter.name",
    descriptionKey: "tiers.starter.description",
    price: {
      monthly: 0,
      yearly: 0,
    },
    productIds: {
      monthly: "",
      yearly: "",
    },
    featureKeys: [
      "tiers.starter.features.item1",
      "tiers.starter.features.item2",
      "tiers.starter.features.item3",
      "tiers.starter.features.item4",
    ],
    ctaKey: "tiers.starter.cta",
    isFree: true,
  },
  {
    id: "pro",
    nameKey: "tiers.pro.name",
    descriptionKey: "tiers.pro.description",
    badgeKey: "tiers.pro.badge",
    popular: true,
    price: {
      monthly: 19,
      yearly: 190,
    },
    productIds: {
      monthly:
        process.env.NEXT_PUBLIC_POLAR_PRODUCT_PRO_MONTHLY ||
        "pro_monthly_placeholder",
      yearly:
        process.env.NEXT_PUBLIC_POLAR_PRODUCT_PRO_YEARLY ||
        "pro_yearly_placeholder",
    },
    featureKeys: [
      "tiers.pro.features.item1",
      "tiers.pro.features.item2",
      "tiers.pro.features.item3",
      "tiers.pro.features.item4",
      "tiers.pro.features.item5",
    ],
    ctaKey: "tiers.pro.cta",
  },
  {
    id: "enterprise",
    nameKey: "tiers.enterprise.name",
    descriptionKey: "tiers.enterprise.description",
    price: {
      monthly: 79,
      yearly: 790,
    },
    productIds: {
      monthly:
        process.env.NEXT_PUBLIC_POLAR_PRODUCT_ENTERPRISE_MONTHLY ||
        "enterprise_monthly_placeholder",
      yearly:
        process.env.NEXT_PUBLIC_POLAR_PRODUCT_ENTERPRISE_YEARLY ||
        "enterprise_yearly_placeholder",
    },
    featureKeys: [
      "tiers.enterprise.features.item1",
      "tiers.enterprise.features.item2",
      "tiers.enterprise.features.item3",
      "tiers.enterprise.features.item4",
      "tiers.enterprise.features.item5",
      "tiers.enterprise.features.item6",
    ],
    ctaKey: "tiers.enterprise.cta",
  },
];

export const PRICING_FAQS = [
  {
    questionKey: "faq.item1.question",
    answerKey: "faq.item1.answer",
  },
  {
    questionKey: "faq.item2.question",
    answerKey: "faq.item2.answer",
  },
  {
    questionKey: "faq.item3.question",
    answerKey: "faq.item3.answer",
  },
  {
    questionKey: "faq.item4.question",
    answerKey: "faq.item4.answer",
  },
];
