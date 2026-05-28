import assert from "node:assert/strict";
import { handleGetQueue } from "../src/tools/get-queue.js";
import { handleScoreCreative } from "../src/tools/score-creative.js";

process.env.BRANDGUARD_FORCE_HEURISTIC = "1";
process.env.SCORE_THRESHOLD_APPROVE ??= "70";
process.env.SCORE_THRESHOLD_BLOCK ??= "40";

type ExpectedStatus = "approved" | "blocked" | "escalated";

const scenarios: Array<{
  brand: string;
  campaignName: string;
  creativeText: string;
  expectedStatus: ExpectedStatus;
}> = [
  {
    brand: "Nike",
    campaignName: "Summer Drop 2026",
    creativeText: "Crush the competition. Dominate every run. Nothing beats Nike.",
    expectedStatus: "blocked",
  },
  {
    brand: "Barclays",
    campaignName: "Mortgage Q3",
    creativeText: "Rates are dropping fast. Lock in now before the window closes.",
    expectedStatus: "escalated",
  },
  {
    brand: "Dyson",
    campaignName: "Launch 2026",
    creativeText: "Engineered for precision cleaning with tested performance claims.",
    expectedStatus: "approved",
  },
];

async function run() {
  console.log("BrandGuard demo verification (deterministic heuristic mode)");
  console.log("----------------------------------------------------------");

  for (const scenario of scenarios) {
    const result = await handleScoreCreative({
      brand: scenario.brand,
      campaignName: scenario.campaignName,
      creativeText: scenario.creativeText,
      placementType: "ChatGPT",
      cpcBid: 3.5,
    });

    if ("error" in result) {
      throw new Error(`${scenario.brand}: ${result.error}`);
    }
    assert.equal(
      result.status,
      scenario.expectedStatus,
      `${scenario.brand}: expected ${scenario.expectedStatus}, got ${result.status}`,
    );

    console.log(
      `${scenario.brand.padEnd(9)} -> status=${result.status.padEnd(9)} safety=${String(result.safetyScore).padEnd(3)} brandFit=${result.brandFitScore}`,
    );
  }

  const queue = handleGetQueue({ filter: "all" });
  console.log("----------------------------------------------------------");
  console.log(
    `Queue stats: total=${queue.stats.total}, approved=${queue.stats.approved}, escalated=${queue.stats.escalated}, blocked=${queue.stats.blocked}`,
  );
  console.log("Verification passed.");
}

await run();
