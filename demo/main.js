const queueEl = document.getElementById("queue");
const statsEl = document.getElementById("stats");
const pendingLabel = document.getElementById("pendingLabel");
const liveLabel = document.getElementById("liveLabel");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const templates = [
  {
    brand: "Nike",
    campaignName: "Summer Drop",
    creativeText: "Crush the competition. Dominate every run. Nothing beats Nike.",
    placementType: "ChatGPT",
    cpcBid: 3.2,
    finalStatus: "blocked",
    safetyScore: 32,
    brandFitScore: 72,
    reasons: ['Escalation keyword detected: "crush"', "Comparative aggression tone"],
  },
  {
    brand: "Barclays",
    campaignName: "Mortgage Q3",
    creativeText: "Rates are dropping fast. Lock in now before the window closes.",
    placementType: "Claude",
    cpcBid: 4.8,
    finalStatus: "pending",
    safetyScore: 42,
    brandFitScore: 72,
    reasons: ["FCA urgency language in financial promotion"],
  },
  {
    brand: "Dyson",
    campaignName: "Engineering Launch",
    creativeText: "Engineered airflow and measured performance in every pass.",
    placementType: "ChatGPT",
    cpcBid: 3.1,
    finalStatus: "approved",
    safetyScore: 78,
    brandFitScore: 72,
    reasons: ["No high-risk policy triggers detected"],
  },
];

const state = {
  running: false,
  seq: 0,
  queue: [],
  tickTimer: null,
};

function scoreColor(score) {
  if (score >= 70) return "#1D9E75";
  if (score >= 40) return "#EF9F27";
  return "#E24B4A";
}

function statusStyle(status) {
  if (status === "processing") return { bg: "#E8ECFF", fg: "#2F46B9", border: "#4F6EF7" };
  if (status === "approved") return { bg: "#E1F5EE", fg: "#085041", border: "#1D9E75" };
  if (status === "blocked") return { bg: "#FCEBEB", fg: "#A32D2D", border: "#E24B4A" };
  return { bg: "#FAEEDA", fg: "#633806", border: "#EF9F27" };
}

function statusLabel(status) {
  if (status === "processing") return "Processing";
  if (status === "approved") return "Approved";
  if (status === "blocked") return "Blocked";
  return "Needs review";
}

function computeStats(queue) {
  const total = queue.length;
  const processing = queue.filter((q) => q.status === "processing").length;
  const approved = queue.filter((q) => q.status === "approved").length;
  const blocked = queue.filter((q) => q.status === "blocked").length;
  const escalated = queue.filter((q) => q.status === "pending").length;
  return { total, processing, approved, blocked, escalated };
}

function renderStats() {
  const stats = computeStats(state.queue);
  pendingLabel.textContent = `${stats.processing + stats.escalated} need review`;
  const cards = [
    ["Scored", stats.total, "#dbe2f2"],
    ["Processing", stats.processing, "#4F6EF7"],
    ["Auto-approved", stats.approved, "#1D9E75"],
    ["Escalated", stats.escalated, "#BA7517"],
    ["Blocked", stats.blocked, "#E24B4A"],
  ];
  statsEl.innerHTML = cards
    .map(
      ([label, value, color]) => `
      <div class="stat">
        <div class="stat-label">${label}</div>
        <div class="stat-value" style="color:${color}">${value}</div>
      </div>
    `,
    )
    .join("");
}

function renderQueue() {
  queueEl.innerHTML = state.queue
    .map((item) => {
      const style = statusStyle(item.status);
      const safety = item.status === "processing" ? "..." : item.safetyScore;
      const fit = item.status === "processing" ? "..." : item.brandFitScore;
      const safetyWidth = item.status === "processing" ? 18 : item.safetyScore;
      const fitWidth = item.status === "processing" ? 18 : item.brandFitScore;
      return `
      <article class="card" style="border-left-color:${style.border}">
        <div class="card-head">
          <div>
            <div class="title">${item.brand} — ${item.campaignName}</div>
            <div class="meta">${item.id} · ${item.placementType} · $${item.cpcBid.toFixed(2)} CPC</div>
          </div>
          <span class="badge" style="background:${style.bg};color:${style.fg}">${statusLabel(item.status)}</span>
        </div>
        <div class="creative">"${item.creativeText}"</div>
        <div class="meter">
          <div class="meter-line">
            <span class="meter-label">Safety</span>
            <div class="bar-wrap"><div class="bar" style="width:${safetyWidth}%;background:${item.status === "processing" ? "#8FA0FA" : scoreColor(item.safetyScore)}"></div></div>
            <span class="meter-value" style="color:${item.status === "processing" ? "#4F6EF7" : scoreColor(item.safetyScore)}">${safety}</span>
          </div>
          <div class="meter-line">
            <span class="meter-label">Brand fit</span>
            <div class="bar-wrap"><div class="bar" style="width:${fitWidth}%;background:${item.status === "processing" ? "#8FA0FA" : scoreColor(item.brandFitScore)}"></div></div>
            <span class="meter-value" style="color:${item.status === "processing" ? "#4F6EF7" : scoreColor(item.brandFitScore)}">${fit}</span>
          </div>
        </div>
        <div class="reasons">
          ${
            item.status === "processing"
              ? "<div>Simulating Tavily + scoring pipeline...</div>"
              : item.reasons.map((r) => `<div>› ${r}</div>`).join("")
          }
        </div>
      </article>
    `;
    })
    .join("");
}

function render() {
  renderStats();
  renderQueue();
}

function enqueueOne() {
  const tpl = templates[state.seq % templates.length];
  state.seq += 1;
  const id = `CRE-${String(state.seq).padStart(3, "0")}`;
  const item = {
    ...tpl,
    id,
    status: "processing",
    safetyScore: 0,
    brandFitScore: 0,
  };
  state.queue.unshift(item);
  render();

  const processingMs = 1200 + Math.floor(Math.random() * 900);
  window.setTimeout(() => {
    item.status = tpl.finalStatus;
    item.safetyScore = tpl.safetyScore;
    item.brandFitScore = tpl.brandFitScore;
    item.reasons = tpl.reasons;
    render();
  }, processingMs);
}

function scheduleTick() {
  if (!state.running) return;
  enqueueOne();
  const influxMs = 1400 + Math.floor(Math.random() * 1200);
  state.tickTimer = window.setTimeout(scheduleTick, influxMs);
}

function start() {
  if (state.running) return;
  state.running = true;
  liveLabel.textContent = "Simulated · running";
  scheduleTick();
}

function pause() {
  state.running = false;
  liveLabel.textContent = "Simulated · paused";
  if (state.tickTimer) {
    clearTimeout(state.tickTimer);
    state.tickTimer = null;
  }
}

function reset() {
  pause();
  state.seq = 0;
  state.queue = [];
  liveLabel.textContent = "Simulated";
  render();
}

startBtn.addEventListener("click", start);
pauseBtn.addEventListener("click", pause);
resetBtn.addEventListener("click", reset);

reset();
start();
