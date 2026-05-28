import { handleScoreCreative, type ScoreCreativeInput } from "../tools/score-creative.js";

const demoCreatives: ScoreCreativeInput[] = [
  {
    brand: "Nike",
    campaignName: "Velocity Push",
    creativeText: "Crush every challenge and dominate your next run.",
    placementType: "ChatGPT",
    cpcBid: 3.4,
  },
  {
    brand: "Barclays",
    campaignName: "Mortgage Sprint",
    creativeText: "Rates are dropping fast. Lock in now before the window closes.",
    placementType: "Claude",
    cpcBid: 4.6,
  },
  {
    brand: "Dyson",
    campaignName: "Precision Launch",
    creativeText: "Engineered airflow and measured performance for everyday cleaning.",
    placementType: "ChatGPT",
    cpcBid: 3.1,
  },
  {
    brand: "Nike",
    campaignName: "City Night Run",
    creativeText: "Every step is progress. Run with confidence and control.",
    placementType: "Claude",
    cpcBid: 3.0,
  },
  {
    brand: "Dyson",
    campaignName: "Lab Tested Facts",
    creativeText: "Lab-tested suction with factual comparative benchmarks.",
    placementType: "ChatGPT",
    cpcBid: 2.9,
  },
];

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let submitted = 0;

function parseIntFlag(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function scheduleNext(run: () => Promise<void>, influxMs: number) {
  timer = setTimeout(() => {
    void run();
  }, influxMs);
}

export function getDemoInfluxState() {
  return {
    running,
    submitted,
  };
}

export function stopDemoInfluxLoop() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  running = false;
}

export function startDemoInfluxLoop() {
  if (process.env.BRANDGUARD_DEMO_SIM !== "1" || running) return;

  const influxMs = Math.max(
    50,
    parseIntFlag(process.env.BRANDGUARD_DEMO_INFLUX_MS, 2500),
  );
  const maxSubmissions = Math.max(
    0,
    parseIntFlag(process.env.BRANDGUARD_DEMO_INFLUX_MAX, 0),
  );

  if (!process.env.BRANDGUARD_FORCE_HEURISTIC) {
    process.env.BRANDGUARD_FORCE_HEURISTIC = "1";
  }

  running = true;
  console.log(
    `[BrandGuard Demo] Influx loop started (every ${influxMs}ms, max=${maxSubmissions || "unlimited"})`,
  );

  const runTick = async () => {
    if (!running) return;
    const baseCreative = demoCreatives[submitted % demoCreatives.length];
    const sequence = submitted + 1;

    await handleScoreCreative(
      {
        ...baseCreative,
        campaignName: `${baseCreative.campaignName} #${sequence}`,
      },
      { simulateProcessing: true },
    );
    submitted += 1;
    if (maxSubmissions > 0 && submitted >= maxSubmissions) {
      console.log("[BrandGuard Demo] Influx max reached, stopping loop");
      stopDemoInfluxLoop();
      return;
    }
    scheduleNext(runTick, influxMs);
  };

  void runTick();
}
