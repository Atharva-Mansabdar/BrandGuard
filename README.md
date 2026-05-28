# BrandGuard

Autonomous brand safety agent for LLM-native ad placements. Score ad creative before it appears inside ChatGPT, Claude, or similar surfaces — enriched with Tavily web intelligence, traced by Overmind, and reviewed in a Skybridge MCP dashboard.

Built for Cursor AdTech Hackathon 2026.

## Stack

- **Skybridge** — MCP server + inline React review queue
- **Anthropic Claude** — creative scoring
- **Tavily** — live regulatory / brand-safety context
- **Overmind** — agent tracing and prompt optimisation (`overmind_agent.py`)
- **Alpic** — tunnel + deploy (`npm run dev:tunnel`)

## Setup

```bash
cp .env.example .env
# Required: ANTHROPIC_API_KEY and TAVILY_API_KEY
# Optional: OVERMIND_API_KEY
# Defaults:
# SCORE_THRESHOLD_APPROVE=70
# SCORE_THRESHOLD_BLOCK=40
# SKYBRIDGE_VIEW_DOMAIN=https://skybridge.tech
# BRANDGUARD_FORCE_HEURISTIC=0
# BRANDGUARD_DEMO_SIM=0
# BRANDGUARD_DEMO_INFLUX_MS=2500
# BRANDGUARD_DEMO_PROCESSING_MS=1500
# BRANDGUARD_DEMO_INFLUX_MAX=0
npm install
```

## Run locally

```bash
npm run dev
```

Public tunnel for Claude / ChatGPT MCP:

```bash
npm run dev:tunnel
```

Connect the printed `/mcp` URL in Claude → Settings → Integrations → Add MCP server (name: **BrandGuard**).

## Deploy and audit

Stable public endpoint:

```bash
alpic deploy --project-name brandguard --runtime node24 --env-file .env
```

Compatibility check (Claude.ai + ChatGPT MCP):

```bash
alpic audit --url https://brandguard.alpic.live/mcp
```

## MCP tools

| Tool | Purpose |
|------|---------|
| `score_creative` | Score copy for Nike, Barclays, or Dyson; auto-approve/block or escalate |
| `get_review_queue` | List queue + stats |
| `resolve_creative` | Human approve/block (`CRE-001`, etc.) |

## Demo prompts

```
Score this Nike creative for brand safety:
Brand: Nike
Campaign: Summer Drop 2026
Creative: "Crush the competition. Dominate every run. Nothing beats Nike."
Placement: ChatGPT
CPC: 3.20
```

```
Score this Barclays creative:
Brand: Barclays
Campaign: Mortgage Q3
Creative: "Rates are dropping fast. Lock in now before the window closes."
Placement: Claude
CPC: 4.80
```

```
Show me the review queue
```

## Overmind

```bash
# In Cursor with Overmind extension:
# /overmind-register-agent overmind_agent.py
# /overmind-generate-spec-and-dataset brandguard
# /overmind-optimize-agent brandguard
```

Runtime tracing notes:
- `OVERMIND_API_KEY` enables server-side trace emission for `score_creative`.
- If the Overmind JS SDK is unavailable in the runtime, scoring still works and tracing is explicitly disabled with a startup warning.

## Demo verification

Run a deterministic end-to-end check of the three demo creatives:

```bash
npm run verify:demo
```

This forces heuristic mode for reproducible statuses:
- Nike aggression copy -> blocked
- Barclays urgency copy -> escalated
- Dyson neutral copy -> approved
- processing lifecycle transition (`processing` -> final status)
- capped synthetic influx simulation and queue accounting checks

Saved evidence snapshot: `docs/demo-verification.md`.

## Demo simulation mode (high-throughput, API-free)

To simulate a live influx of creatives with visible processing delay in queue:

```bash
# in .env
BRANDGUARD_DEMO_SIM=1
BRANDGUARD_DEMO_INFLUX_MS=2500
BRANDGUARD_DEMO_PROCESSING_MS=1500
BRANDGUARD_DEMO_INFLUX_MAX=0
BRANDGUARD_FORCE_HEURISTIC=1

# then run
npm run dev
```

Notes:
- `BRANDGUARD_DEMO_SIM=1` enables synthetic submissions in the background.
- `BRANDGUARD_DEMO_PROCESSING_MS` controls the per-item scoring delay.
- `BRANDGUARD_DEMO_INFLUX_MS` controls arrival cadence.
- `BRANDGUARD_DEMO_INFLUX_MAX=0` means run continuously until server stops.

## Hardcoded standalone web demo (no integration)

If you want a pure browser demo with zero MCP/API integration:

```bash
npm run demo:web
```

Then open:
- `http://localhost:4173`

This standalone demo is fully hardcoded and simulates:
- prompt influx,
- processing delay,
- final score decisions (blocked/escalated/approved),
- live stats updates.

## Supported brands

Nike, Barclays, Dyson — extend policies in `src/lib/policy.ts`.

Without API keys, scoring falls back to keyword heuristics so the UI still demos.
