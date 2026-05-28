export interface BrandPolicy {
  name: string;
  industry: string;
  toneGuidelines: string[];
  blockedTopics: string[];
  regulatoryContext: string;
  escalationKeywords: string[];
}

export const defaultPolicies: Record<string, BrandPolicy> = {
  nike: {
    name: "Nike",
    industry: "sportswear",
    toneGuidelines: [
      "Inspirational and empowering",
      "Active and energetic",
      "Inclusive — avoid language that excludes body types or abilities",
    ],
    blockedTopics: [
      "violence",
      "gambling",
      "political controversy",
      "alcohol",
    ],
    regulatoryContext:
      "UK ASA CAP Code section 15 (sports and physical activity). Avoid unsubstantiated performance claims.",
    escalationKeywords: [
      "crush",
      "dominate",
      "destroy",
      "kill",
      "beat",
      "annihilate",
    ],
  },
  barclays: {
    name: "Barclays",
    industry: "financial services",
    toneGuidelines: [
      "Professional and trustworthy",
      "Clear and transparent — no misleading urgency",
      "FCA compliant — no guaranteed return claims",
    ],
    blockedTopics: [
      "gambling",
      "crypto speculation",
      "get rich quick",
      "political",
    ],
    regulatoryContext:
      "FCA CONC rules on financial promotions. FCA Financial Promotions Order 2005. Must not imply urgency to pressure financial decisions.",
    escalationKeywords: [
      "guaranteed",
      "risk-free",
      "lock in now",
      "before it's too late",
      "rates dropping fast",
      "window closes",
    ],
  },
  dyson: {
    name: "Dyson",
    industry: "consumer electronics",
    toneGuidelines: [
      "Premium and engineering-led",
      "Factual — back claims with specifications",
      "Avoid superlatives without evidence",
    ],
    blockedTopics: [
      "health claims without evidence",
      "environmental greenwashing",
    ],
    regulatoryContext:
      "UK ASA CAP Code on comparative advertising. CMA guidance on environmental claims.",
    escalationKeywords: [
      "cures",
      "eliminates all",
      "proven to",
      "scientifically proven",
    ],
  },
};

export function getPolicyForBrand(brandName: string): BrandPolicy | null {
  const key = brandName.toLowerCase().trim();
  return defaultPolicies[key] ?? null;
}
