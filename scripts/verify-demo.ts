import assert from "node:assert/strict";
import { getDemoInfluxState, startDemoInfluxLoop, stopDemoInfluxLoop } from "../src/lib/demo-influx.js";
import { resetQueue } from "../src/store.js";
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDeterministicStatusCheck() {
  process.env.BRANDGUARD_DEMO_SIM = "0";
  resetQueue();
  console.log("Deterministic status check");
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
  console.log(
    `Queue stats: total=${queue.stats.total}, processing=${queue.stats.processing}, approved=${queue.stats.approved}, escalated=${queue.stats.escalated}, blocked=${queue.stats.blocked}`,
  );
  assert.equal(queue.stats.total, 3, "Expected 3 deterministic queue items");
}

async function runProcessingLifecycleCheck() {
  process.env.BRANDGUARD_DEMO_SIM = "1";
  process.env.BRANDGUARD_DEMO_PROCESSING_MS = "180";
  resetQueue();
  console.log("Processing lifecycle check");
  console.log("----------------------------------------------------------");

  const queued = await handleScoreCreative({
    brand: "Barclays",
    campaignName: "Lifecycle Probe",
    creativeText: "Rates are dropping fast. Lock in now before the window closes.",
    placementType: "Claude",
    cpcBid: 4.2,
  });

  if ("error" in queued) {
    throw new Error(`Lifecycle check failed: ${queued.error}`);
  }
  assert.equal(queued.status, "processing");

  const immediateQueue = handleGetQueue({ filter: "all" });
  assert.equal(immediateQueue.stats.processing, 1, "Expected one processing item");
  console.log("Immediate queue state includes processing item");

  await sleep(240);
  const completedQueue = handleGetQueue({ filter: "all" });
  const first = completedQueue.items[0];
  assert.ok(first, "Expected one queue item after lifecycle transition");
  assert.notEqual(first.status, "processing", "Item should leave processing state");
  console.log(`Post-delay status=${first.status}, safety=${first.safetyScore}`);
}

async function runInfluxCheck() {
  resetQueue();
  process.env.BRANDGUARD_DEMO_SIM = "1";
  process.env.BRANDGUARD_DEMO_INFLUX_MS = "90";
  process.env.BRANDGUARD_DEMO_PROCESSING_MS = "120";
  process.env.BRANDGUARD_DEMO_INFLUX_MAX = "4";

  console.log("Influx simulation check");
  console.log("----------------------------------------------------------");
  stopDemoInfluxLoop();
  startDemoInfluxLoop();

  await sleep(900);
  const influxState = getDemoInfluxState();
  const queue = handleGetQueue({ filter: "all" });

  assert.equal(influxState.submitted, 4, "Expected four simulated submissions");
  assert.equal(
    influxState.running,
    false,
    "Influx loop should stop after reaching max",
  );
  assert.equal(queue.stats.total, 4, "Expected four queued items from influx");
  console.log(
    `Influx submitted=${influxState.submitted}, total=${queue.stats.total}, processing=${queue.stats.processing}`,
  );
}

async function run() {
  console.log("BrandGuard demo verification");
  console.log("==========================================================");
  await runDeterministicStatusCheck();
  console.log("----------------------------------------------------------");
  await runProcessingLifecycleCheck();
  console.log("----------------------------------------------------------");
  await runInfluxCheck();
  console.log("----------------------------------------------------------");
  const finalQueue = handleGetQueue({ filter: "all" });
  console.log(
    `Final queue stats: total=${finalQueue.stats.total}, processing=${finalQueue.stats.processing}, approved=${finalQueue.stats.approved}, escalated=${finalQueue.stats.escalated}, blocked=${finalQueue.stats.blocked}`,
  );
  console.log("Verification passed.");
}

try {
  await run();
} finally {
  stopDemoInfluxLoop();
  process.env.BRANDGUARD_DEMO_SIM = "0";
}
