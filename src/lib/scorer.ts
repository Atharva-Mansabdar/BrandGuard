import Anthropic from "@anthropic-ai/sdk";
import type { BrandPolicy } from "./policy.js";
import type { TavilyEnrichment } from "./tavily.js";
import { withTrace } from "./overmind.js";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export interface ScoreResult {
  safetyScore: number;
  brandFitScore: number;
  status: "approved" | "blocked" | "escalated";
  reasons: string[];
  confidence: number;
}

const SCORING_PROMPT = `You are a senior brand safety compliance officer at an ad verification company.

You are reviewing advertising copy before it is placed inside an LLM chatbot interface (e.g. ChatGPT or Claude).
This is DIFFERENT from traditional web advertising — the ad appears INSIDE a conversational AI response,
which users trust as authoritative. Brand adjacency in this context means perceived endorsement by the AI.
The stakes are higher than banner ads.

You will be given:
1. The ad creative text
2. The brand's policy (tone guidelines, blocked topics, regulatory requirements)
3. Live web intelligence from Tavily (regulatory context, recent brand safety signals)

Score the creative on TWO dimensions (0-100 each):
- SAFETY SCORE: Risk of regulatory violation, reputational harm, or policy breach
  - 0-39: Clear violation — must block
  - 40-69: Ambiguous — requires human review
  - 70-100: Clean — safe to serve
- BRAND FIT SCORE: How well the copy matches the brand's stated tone and guidelines

Then provide:
- A list of specific reasons (max 3, each under 15 words)
- A confidence level (0-100) in your assessment

CRITICAL RULES:
- For financial services brands: ANY urgency language ("act now", "rates dropping", "lock in", "before it's too late") 
  is an automatic score ≤45 due to FCA financial promotion rules.
- For any brand: words like "crush", "dominate", "destroy" targeting competitors score ≤35.
- Consider the Tavily web intelligence seriously — it reflects real, current regulatory context.

Respond ONLY with valid JSON, no markdown fences, no preamble:
{
  "safetyScore": <number 0-100>,
  "brandFitScore": <number 0-100>,
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "confidence": <number 0-100>
}`;

function parseJsonResponse(raw: string): {
  safetyScore: number;
  brandFitScore: number;
  reasons: string[];
  confidence: number;
} {
  const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

function heuristicScore(
  creativeText: string,
  policy: BrandPolicy,
  enrichment: TavilyEnrichment,
): ScoreResult {
  const lower = creativeText.toLowerCase();
  let safetyScore = 78;
  const reasons: string[] = [];

  for (const kw of policy.escalationKeywords) {
    if (lower.includes(kw.toLowerCase())) {
      safetyScore = Math.min(safetyScore, 32);
      reasons.push(`Escalation keyword detected: "${kw}"`);
      break;
    }
  }

  if (policy.industry === "financial services") {
    const urgency = [
      "lock in",
      "before it",
      "window closes",
      "rates dropping",
      "act now",
    ];
    if (urgency.some((p) => lower.includes(p))) {
      safetyScore = Math.min(safetyScore, 42);
      reasons.push("FCA urgency language in financial promotion");
    }
  }

  if (enrichment.trendingUnsafeContexts.length > 0) {
    safetyScore = Math.min(safetyScore, 44);
    reasons.push("Tavily flagged regulatory risk context");
  }

  if (reasons.length === 0) {
    reasons.push("No policy triggers in heuristic mode");
  }

  const approveThreshold = parseInt(
    process.env.SCORE_THRESHOLD_APPROVE ?? "70",
    10,
  );
  const blockThreshold = parseInt(
    process.env.SCORE_THRESHOLD_BLOCK ?? "40",
    10,
  );

  let status: ScoreResult["status"];
  if (safetyScore >= approveThreshold) status = "approved";
  else if (safetyScore < blockThreshold) status = "blocked";
  else status = "escalated";

  return {
    safetyScore,
    brandFitScore: 72,
    status,
    reasons: reasons.slice(0, 3),
    confidence: 65,
  };
}

export async function scoreCreative(
  creativeText: string,
  policy: BrandPolicy,
  enrichment: TavilyEnrichment,
): Promise<ScoreResult> {
  return withTrace(
    "score_creative",
    {
      brand: policy.name,
      industry: policy.industry,
      creativeLength: creativeText.length,
    },
    async () => {
      if (!anthropic) {
        return heuristicScore(creativeText, policy, enrichment);
      }

      const userMessage = `
CREATIVE TEXT:
"${creativeText}"

BRAND POLICY FOR ${policy.name.toUpperCase()}:
Industry: ${policy.industry}
Tone guidelines: ${policy.toneGuidelines.join("; ")}
Blocked topics: ${policy.blockedTopics.join(", ")}
Regulatory context: ${policy.regulatoryContext}
Escalation trigger words: ${policy.escalationKeywords.join(", ")}

LIVE TAVILY WEB INTELLIGENCE:
Regulatory risks: ${enrichment.regulatoryRisks.join(" | ") || "None found"}
Brand safety signals: ${enrichment.competitorFlags.join(" | ") || "None found"}
Trending unsafe contexts: ${enrichment.trendingUnsafeContexts.join(" | ") || "None found"}
`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: SCORING_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const block = response.content[0];
      const raw =
        block.type === "text" ? block.text.trim() : '{"safetyScore":50}';
      const parsed = parseJsonResponse(raw);

      const approveThreshold = parseInt(
        process.env.SCORE_THRESHOLD_APPROVE ?? "70",
        10,
      );
      const blockThreshold = parseInt(
        process.env.SCORE_THRESHOLD_BLOCK ?? "40",
        10,
      );

      let status: ScoreResult["status"];
      if (parsed.safetyScore >= approveThreshold) status = "approved";
      else if (parsed.safetyScore < blockThreshold) status = "blocked";
      else status = "escalated";

      return {
        safetyScore: parsed.safetyScore,
        brandFitScore: parsed.brandFitScore,
        status,
        reasons: parsed.reasons ?? [],
        confidence: parsed.confidence ?? 80,
      };
    },
  );
}
