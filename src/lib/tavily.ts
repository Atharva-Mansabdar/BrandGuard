import { tavily } from "@tavily/core";

export interface TavilyEnrichment {
  regulatoryRisks: string[];
  competitorFlags: string[];
  trendingUnsafeContexts: string[];
  rawSummary: string;
}

const emptyEnrichment = (): TavilyEnrichment => ({
  regulatoryRisks: [],
  competitorFlags: [],
  trendingUnsafeContexts: [],
  rawSummary: "Tavily enrichment skipped (no API key).",
});

export async function enrichCreative(
  creativeText: string,
  brand: string,
  industry: string,
  regulatoryContext: string,
): Promise<TavilyEnrichment> {
  if (!process.env.TAVILY_API_KEY) {
    const enrichment = emptyEnrichment();
    if (industry === "financial services") {
      const urgencyPatterns = [
        "lock in",
        "before it",
        "window closes",
        "rates dropping",
        "act now",
        "limited time",
      ];
      const found = urgencyPatterns.filter((p) =>
        creativeText.toLowerCase().includes(p),
      );
      if (found.length > 0) {
        enrichment.trendingUnsafeContexts.push(
          `FCA red-flag urgency patterns detected: ${found.join(", ")}. FCA CONC rules prohibit pressure tactics in financial promotions.`,
        );
        enrichment.rawSummary = enrichment.trendingUnsafeContexts[0] ?? "";
      }
    }
    return enrichment;
  }

  const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

  const [regulatoryResult, safetyResult] = await Promise.all([
    client.search(
      `${regulatoryContext} ad copy compliance violations 2026`,
      {
        searchDepth: "basic",
        maxResults: 3,
        includeAnswer: true,
      },
    ),
    client.search(
      `"${brand}" brand safety ad complaints ASA FCA violations creative copy`,
      {
        searchDepth: "basic",
        maxResults: 3,
        includeAnswer: true,
      },
    ),
  ]);

  const regulatoryRisks: string[] = [];
  const competitorFlags: string[] = [];
  const trendingUnsafeContexts: string[] = [];

  const regAnswer = regulatoryResult.answer ?? "";
  const safetyAnswer = safetyResult.answer ?? "";

  if (regAnswer) regulatoryRisks.push(regAnswer.slice(0, 200));
  if (safetyAnswer) competitorFlags.push(safetyAnswer.slice(0, 200));

  if (industry === "financial services") {
    const urgencyPatterns = [
      "lock in",
      "before it",
      "window closes",
      "rates dropping",
      "act now",
      "limited time",
    ];
    const found = urgencyPatterns.filter((p) =>
      creativeText.toLowerCase().includes(p),
    );
    if (found.length > 0) {
      trendingUnsafeContexts.push(
        `FCA red-flag urgency patterns detected: ${found.join(", ")}. FCA CONC rules prohibit pressure tactics in financial promotions.`,
      );
    }
  }

  const rawSummary = [
    regAnswer ? `Regulatory: ${regAnswer.slice(0, 150)}` : "",
    safetyAnswer ? `Brand signals: ${safetyAnswer.slice(0, 150)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    regulatoryRisks,
    competitorFlags,
    trendingUnsafeContexts,
    rawSummary: rawSummary || "No specific signals found.",
  };
}
