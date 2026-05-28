import { getPolicyForBrand } from "../lib/policy.js";
import { enrichCreative } from "../lib/tavily.js";
import { scoreCreative } from "../lib/scorer.js";
import { addToQueue, resolveItem, updateQueueItem } from "../store.js";
import { buildQueuePayload, mapScoreStatusToQueue } from "./queue-helpers.js";

export interface ScoreCreativeInput {
  brand: string;
  campaignName: string;
  creativeText: string;
  placementType?: string;
  cpcBid?: number;
}

interface HandleScoreCreativeOptions {
  simulateProcessing?: boolean;
  processingDelayMs?: number;
}

function getProcessingDelayMs(override?: number): number {
  if (typeof override === "number") return Math.max(0, override);
  const parsed = Number.parseInt(
    process.env.BRANDGUARD_DEMO_PROCESSING_MS ?? "0",
    10,
  );
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function shouldSimulateProcessing(override?: boolean): boolean {
  if (typeof override === "boolean") return override;
  return process.env.BRANDGUARD_DEMO_SIM === "1";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleScoreCreative(
  input: ScoreCreativeInput,
  options?: HandleScoreCreativeOptions,
) {
  const policy = getPolicyForBrand(input.brand);

  if (!policy) {
    return {
      error: `No brand policy found for "${input.brand}". Supported brands: Nike, Barclays, Dyson.`,
    };
  }

  const simulateProcessing = shouldSimulateProcessing(options?.simulateProcessing);
  const processingDelayMs = getProcessingDelayMs(options?.processingDelayMs);
  const queueItem = addToQueue({
    brand: policy.name,
    campaignName: input.campaignName,
    creativeText: input.creativeText,
    placementType: input.placementType ?? "ChatGPT",
    cpcBid: input.cpcBid ?? 3.5,
    safetyScore: 0,
    brandFitScore: 0,
    status: simulateProcessing ? "processing" : "pending",
    reasons: [],
    tavilyContext: "",
  });

  const finalize = async () => {
    if (processingDelayMs > 0) {
      await sleep(processingDelayMs);
    }

    const enrichment = await enrichCreative(
      input.creativeText,
      policy.name,
      policy.industry,
      policy.regulatoryContext,
    );

    const score = await scoreCreative(input.creativeText, policy, enrichment);
    updateQueueItem(queueItem.id, {
      safetyScore: score.safetyScore,
      brandFitScore: score.brandFitScore,
      status: mapScoreStatusToQueue(score.status),
      reasons: score.reasons,
      tavilyContext: enrichment.rawSummary,
    });

    if (score.status !== "escalated") {
      resolveItem(queueItem.id, score.status, "auto");
    }

    return {
      score,
      tavilyContext: enrichment.rawSummary,
    };
  };

  if (simulateProcessing) {
    void finalize().catch((error) => {
      updateQueueItem(queueItem.id, {
        status: "pending",
        reasons: [
          "Processing failed in simulation mode",
          error instanceof Error ? error.message : String(error),
        ],
      });
    });

    return {
      id: queueItem.id,
      brand: policy.name,
      status: "processing" as const,
      safetyScore: 0,
      brandFitScore: 0,
      reasons: [],
      tavilyContext: "",
      message: `Creative queued for simulation processing (${processingDelayMs}ms delay).`,
      ...buildQueuePayload(),
    };
  }

  const finalized = await finalize();
  const score = finalized.score;
  const result = {
    id: queueItem.id,
    brand: policy.name,
    status: score.status,
    safetyScore: score.safetyScore,
    brandFitScore: score.brandFitScore,
    reasons: score.reasons,
    tavilyContext: finalized.tavilyContext,
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
