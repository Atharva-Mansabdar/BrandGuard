import { getPolicyForBrand } from "../lib/policy.js";
import { enrichCreative } from "../lib/tavily.js";
import { scoreCreative } from "../lib/scorer.js";
import { addToQueue, resolveItem } from "../store.js";
import { buildQueuePayload, mapScoreStatusToQueue } from "./queue-helpers.js";

export interface ScoreCreativeInput {
  brand: string;
  campaignName: string;
  creativeText: string;
  placementType?: string;
  cpcBid?: number;
}

export async function handleScoreCreative(input: ScoreCreativeInput) {
  const policy = getPolicyForBrand(input.brand);

  if (!policy) {
    return {
      error: `No brand policy found for "${input.brand}". Supported brands: Nike, Barclays, Dyson.`,
    };
  }

  const enrichment = await enrichCreative(
    input.creativeText,
    policy.name,
    policy.industry,
    policy.regulatoryContext,
  );

  const score = await scoreCreative(input.creativeText, policy, enrichment);

  const queueItem = addToQueue({
    brand: policy.name,
    campaignName: input.campaignName,
    creativeText: input.creativeText,
    placementType: input.placementType ?? "ChatGPT",
    cpcBid: input.cpcBid ?? 3.5,
    safetyScore: score.safetyScore,
    brandFitScore: score.brandFitScore,
    status: mapScoreStatusToQueue(score.status),
    reasons: score.reasons,
    tavilyContext: enrichment.rawSummary,
  });

  if (score.status !== "escalated") {
    resolveItem(queueItem.id, score.status, "auto");
  }

  const result = {
    id: queueItem.id,
    brand: policy.name,
    status: score.status,
    safetyScore: score.safetyScore,
    brandFitScore: score.brandFitScore,
    reasons: score.reasons,
    tavilyContext: enrichment.rawSummary,
    message:
      score.status === "approved"
        ? `Creative auto-approved (score: ${score.safetyScore}/100). Ready to serve.`
        : score.status === "blocked"
          ? `Creative auto-blocked (score: ${score.safetyScore}/100). See reasons.`
          : `Score ${score.safetyScore}/100 — below threshold. Added to human review queue.`,
    ...buildQueuePayload(),
  };

  return result;
}
